#!/usr/bin/env bash
# scripts/cloud/provision_aws.sh
# 启动 AWS Spot 实例并初始化环境
set -euo pipefail

INSTANCE_TYPE="c6i.4xlarge"
AMI_ID="ami-0c7217cdde317cfec"   # Ubuntu 22.04 LTS
REGION="${AWS_REGION:-us-east-1}"
KEY_NAME="${AWS_KEY_NAME:-oblivious-mas-key}"
SG_NAME="oblivious-mas-sg"

echo "=== Provisioning AWS Spot Instance ==="

# 1. 创建 Security Group（如不存在）
aws ec2 describe-security-groups --group-names $SG_NAME --region $REGION 2>/dev/null || \
    aws ec2 create-security-group \
        --group-name $SG_NAME \
        --description "Oblivious MAS security group" \
        --region $REGION

SG_ID=$(aws ec2 describe-security-groups \
    --group-names $SG_NAME \
    --region $REGION \
    --query 'SecurityGroups[0].GroupId' --output text)

# 允许 SSH
aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp --port 22 --cidr 0.0.0.0/0 \
    --region $REGION 2>/dev/null || true

# 2. 请求 Spot 实例
SPOT_REQUEST=$(aws ec2 request-spot-instances \
    --instance-count 1 \
    --type "one-time" \
    --launch-specification "{
        \"ImageId\": \"$AMI_ID\",
        \"InstanceType\": \"$INSTANCE_TYPE\",
        \"KeyName\": \"$KEY_NAME\",
        \"SecurityGroupIds\": [\"$SG_ID\"],
        \"BlockDeviceMappings\": [{
            \"DeviceName\": \"/dev/sda1\",
            \"Ebs\": {\"VolumeSize\": 100, \"VolumeType\": \"gp3\"}
        }]
    }" \
    --region $REGION \
    --output json)

SPOT_REQUEST_ID=$(echo $SPOT_REQUEST | jq -r '.SpotInstanceRequests[0].SpotInstanceRequestId')
echo "Spot request: $SPOT_REQUEST_ID"

# 3. 等待实例启动
echo "Waiting for instance..."
aws ec2 wait spot-instance-request-fulfilled \
    --spot-instance-request-ids $SPOT_REQUEST_ID \
    --region $REGION

INSTANCE_ID=$(aws ec2 describe-spot-instance-requests \
    --spot-instance-request-ids $SPOT_REQUEST_ID \
    --region $REGION \
    --query 'SpotInstanceRequests[0].InstanceId' --output text)

# 4. 等待 running 状态
aws ec2 wait instance-running --instance-ids $INSTANCE_ID --region $REGION

PUBLIC_IP=$(aws ec2 describe-instances \
    --instance-ids $INSTANCE_ID \
    --region $REGION \
    --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)

echo "Instance: $INSTANCE_ID"
echo "Public IP: $PUBLIC_IP"

# 5. 保存到文件
cat > .aws_instance.json <<EOF
{
    "instance_id": "$INSTANCE_ID",
    "public_ip": "$PUBLIC_IP",
    "spot_request_id": "$SPOT_REQUEST_ID",
    "region": "$REGION"
}
EOF

echo ""
echo "=== Next steps ==="
echo "ssh ubuntu@$PUBLIC_IP"
echo "bash scripts/cloud/init_remote.sh"