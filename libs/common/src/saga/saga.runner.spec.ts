import { Logger } from '@nestjs/common';
import { runSaga } from './saga.runner';
import { SagaStep } from './saga.types';

interface TestContext {
  value: string;
  step1Done?: boolean;
  step2Done?: boolean;
  step3Done?: boolean;
}

describe('runSaga', () => {
  let logger: Logger;
  let context: TestContext;

  beforeEach(() => {
    logger = new Logger('TestSaga');
    jest.spyOn(logger, 'log').mockImplementation();
    jest.spyOn(logger, 'error').mockImplementation();
    jest.spyOn(logger, 'warn').mockImplementation();
    context = { value: 'test' };
  });

  it('should execute all steps in order (happy path)', async () => {
    const executionOrder: string[] = [];

    const steps: SagaStep<TestContext>[] = [
      {
        name: 'step1',
        execute: async (ctx) => {
          executionOrder.push('step1');
          ctx.step1Done = true;
        },
      },
      {
        name: 'step2',
        execute: async (ctx) => {
          executionOrder.push('step2');
          ctx.step2Done = true;
        },
      },
      {
        name: 'step3',
        execute: async (ctx) => {
          executionOrder.push('step3');
          ctx.step3Done = true;
        },
      },
    ];

    const result = await runSaga(steps, context, logger);

    expect(executionOrder).toEqual(['step1', 'step2', 'step3']);
    expect(result.step1Done).toBe(true);
    expect(result.step2Done).toBe(true);
    expect(result.step3Done).toBe(true);
  });

  it('should compensate step 1 when step 2 fails', async () => {
    const executionOrder: string[] = [];

    const steps: SagaStep<TestContext>[] = [
      {
        name: 'step1',
        execute: async () => {
          executionOrder.push('execute:step1');
        },
        compensate: async () => {
          executionOrder.push('compensate:step1');
        },
      },
      {
        name: 'step2',
        execute: async () => {
          throw new Error('step2 failed');
        },
        compensate: async () => {
          executionOrder.push('compensate:step2');
        },
      },
    ];

    await expect(runSaga(steps, context, logger)).rejects.toThrow(
      'step2 failed',
    );

    expect(executionOrder).toEqual(['execute:step1', 'compensate:step1']);
    expect(executionOrder).not.toContain('compensate:step2');
  });

  it('should compensate steps 2 and 1 in reverse order when step 3 fails', async () => {
    const executionOrder: string[] = [];

    const steps: SagaStep<TestContext>[] = [
      {
        name: 'step1',
        execute: async () => {
          executionOrder.push('execute:step1');
        },
        compensate: async () => {
          executionOrder.push('compensate:step1');
        },
      },
      {
        name: 'step2',
        execute: async () => {
          executionOrder.push('execute:step2');
        },
        compensate: async () => {
          executionOrder.push('compensate:step2');
        },
      },
      {
        name: 'step3',
        execute: async () => {
          throw new Error('step3 failed');
        },
      },
    ];

    await expect(runSaga(steps, context, logger)).rejects.toThrow(
      'step3 failed',
    );

    expect(executionOrder).toEqual([
      'execute:step1',
      'execute:step2',
      'compensate:step2',
      'compensate:step1',
    ]);
  });

  it('should continue compensating remaining steps when a compensation fails', async () => {
    const executionOrder: string[] = [];

    const steps: SagaStep<TestContext>[] = [
      {
        name: 'step1',
        execute: async () => {
          executionOrder.push('execute:step1');
        },
        compensate: async () => {
          executionOrder.push('compensate:step1');
        },
      },
      {
        name: 'step2',
        execute: async () => {
          executionOrder.push('execute:step2');
        },
        compensate: async () => {
          throw new Error('compensation failed');
        },
      },
      {
        name: 'step3',
        execute: async () => {
          throw new Error('step3 failed');
        },
      },
    ];

    await expect(runSaga(steps, context, logger)).rejects.toThrow(
      'step3 failed',
    );

    expect(executionOrder).toEqual([
      'execute:step1',
      'execute:step2',
      'compensate:step1',
    ]);

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('CRITICAL'),
    );
  });

  it('should skip steps without compensate', async () => {
    const executionOrder: string[] = [];

    const steps: SagaStep<TestContext>[] = [
      {
        name: 'step1',
        execute: async () => {
          executionOrder.push('execute:step1');
        },
        compensate: async () => {
          executionOrder.push('compensate:step1');
        },
      },
      {
        name: 'step2_no_compensate',
        execute: async () => {
          executionOrder.push('execute:step2');
        },
      },
      {
        name: 'step3',
        execute: async () => {
          throw new Error('step3 failed');
        },
      },
    ];

    await expect(runSaga(steps, context, logger)).rejects.toThrow(
      'step3 failed',
    );

    expect(executionOrder).toEqual([
      'execute:step1',
      'execute:step2',
      'compensate:step1',
    ]);
  });
});
