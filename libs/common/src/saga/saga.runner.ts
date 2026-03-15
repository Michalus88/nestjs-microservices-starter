import { Logger } from '@nestjs/common';
import { SagaStep } from './saga.types';

export async function runSaga<TContext>(
  steps: SagaStep<TContext>[],
  context: TContext,
  logger: Logger,
): Promise<TContext> {
  const completed: SagaStep<TContext>[] = [];

  for (const step of steps) {
    try {
      logger.log(`Executing step: ${step.name}`);
      await step.execute(context);
      completed.push(step);
    } catch (error) {
      logger.error(`Step "${step.name}" failed: ${error.message}`);
      await compensate(completed, context, logger);
      throw error;
    }
  }

  return context;
}

async function compensate<TContext>(
  completed: SagaStep<TContext>[],
  context: TContext,
  logger: Logger,
): Promise<void> {
  for (const step of [...completed].reverse()) {
    if (!step.compensate) {
      continue;
    }

    try {
      logger.warn(`Compensating step: ${step.name}`);
      await step.compensate(context);
    } catch (error) {
      logger.error(
        `CRITICAL: Compensation for step "${step.name}" failed: ${error.message}`,
      );
    }
  }
}
