// src/tasks/generator.spec.ts

import { expect } from 'chai';
import { TaskGenerator } from './generator';

describe('TaskGenerator', () => {
    let gen: TaskGenerator;

    before(() => {
        gen = new TaskGenerator();
    });

    it('should generate requested number of tasks', () => {
        const tasks = gen.generate(100, 42);
        expect(tasks).to.have.lengthOf(100);
    });

    it('should be deterministic with same seed', () => {
        const tasks1 = gen.generate(50, 42);
        const tasks2 = gen.generate(50, 42);
        expect(tasks1.map((t) => t.description)).to.deep.equal(tasks2.map((t) => t.description));
    });

    it('should produce different results with different seeds', () => {
        const tasks1 = gen.generate(50, 42);
        const tasks2 = gen.generate(50, 1337);
        const same = tasks1.every((t, i) => t.description === tasks2[i].description);
        expect(same).to.be.false;
    });

    it('should respect template_ratio', () => {
        const tasks = gen.generate(100, 42, 0.6);
        const template_count = tasks.filter((t) => t.source === 'template').length;
        expect(template_count).to.equal(60);
    });

    it('should include attacker tasks', () => {
        const tasks = gen.generate(500, 42);
        const attacker_tasks = tasks.filter((t) => t.attacker_type);
        expect(attacker_tasks.length).to.be.greaterThan(0);
    });

    it('should include all expected template names', () => {
        const names = gen.getTemplateNames();
        expect(names).to.have.lengthOf(10);
    });

    it('should return empty array for n=0', () => {
        expect(gen.generate(0, 42)).to.have.lengthOf(0);
    });

    it('should assign departments to all tasks', () => {
        const tasks = gen.generate(50, 42);
        for (const t of tasks) {
            expect(t.assigned_dept).to.be.a('string');
        }
    });
});
