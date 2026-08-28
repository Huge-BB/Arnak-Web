import { baseTempleRules } from './temples/base.ts';
import { birdTempleRules } from './temples/bird.ts';
import { lizardTempleRules } from './temples/lizard.ts';
import { monkeyTempleRules } from './temples/monkey.ts';
import { snakeTempleRules } from './temples/snake.ts';
import type { TempleRules } from './temples/types.ts';

export type { TempleMoveContext, TempleRules } from './temples/types.ts';

const registry: Record<string, TempleRules> = {
  bird: birdTempleRules,
  snake: snakeTempleRules,
  monkey: monkeyTempleRules,
  lizard: lizardTempleRules,
};

export function templeRulesFor(boardId: string): TempleRules {
  return registry[boardId] ?? baseTempleRules;
}
