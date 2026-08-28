import manual from '../data/card-effects-manual.json' with { type: 'json' };
import type { CardEffect, ResourceCost, TravelCost } from './types.ts';

type ManualData = { effects: Record<string, CardEffect[]> };
const resourceName: Record<string, string> = { coin: '金币', compass: '罗盘', tablet: '石板', arrowhead: '箭头', jewel: '宝石' };
const travelName: Record<string, string> = { boot: '鞋', car: '车', boat: '船', plane: '飞机' };
function bundle(value: ResourceCost | TravelCost | undefined) {
  if (!value) return '无';
  return Object.entries(value).filter(([, amount]) => Number(amount)).map(([kind, amount]) => `${amount}${resourceName[kind] ?? travelName[kind] ?? kind}`).join('＋') || '无';
}
function effects(values: CardEffect[]) { return values.map(effect).join('；'); }
function effect(value: CardEffect): string {
  switch (value.type) {
    case 'GAIN_RESOURCE': return `获得 ${value.amount}${resourceName[value.resource]}`;
    case 'GAIN_RESOURCE_PER': return `按${value.counter}获得${resourceName[value.resource]}（最多${value.max ?? '不限'}）`;
    case 'GAIN_TRAVEL': return `获得旅行 ${bundle(value.travel)}`;
    case 'DRAW_CARD': return `抽 ${value.amount} 张牌`;
    case 'DRAW_FROM_BOTTOM': return `从牌库底抽 ${value.amount} 张牌`;
    case 'DRAW_BOTTOM_THEN_KEEP': return `查看牌库底至多 ${value.maximum} 张，留 1 张`;
    case 'DRAW_THEN_KEEP_AND_OPTIONAL_TOP': return `查看牌库顶至多 ${value.maximum} 张，留 1 张并可回顶 1 张`;
    case 'EXILE_SELF': return '放逐本牌';
    case 'EXILE_OWN_CARD': return '放逐自己的一张牌';
    case 'FREE_RESEARCH': return `免费推进${value.token === 'magnifying' ? '放大镜' : '笔记本'}`;
    case 'RESEARCH_DISCOUNT': return `推进放大镜时少付 ${bundle(value.discount)}`;
    case 'PAY_RESOURCE_GAIN': return `支付 ${bundle(value.cost)}：获得 ${bundle(value.gain)}`;
    case 'PAY_RESOURCE_THEN': return `支付 ${bundle(value.cost)}：${effects(value.effects)}`;
    case 'CHOOSE_ONE': return `二选一：${value.options.map(effect).join(' / ')}`;
    case 'CHOOSE_DISTINCT': return `选择 ${value.count} 项不同效果：${value.options.map(effect).join(' / ')}`;
    case 'DISCARD_ONE_THEN': return `弃 1 张牌：${effects(value.effects)}`;
    case 'UPGRADE_RESOURCE_THEN': return `升级 1 个资源：${effects(value.effects)}`;
    case 'ACTIVATE_TENT_SITE': return `激活一个${value.requireEmpty ? '空的' : ''}营地`;
    case 'ACTIVATE_TENT_SITES': return `激活 ${value.count} 个${value.requireEmpty ? '空的' : ''}营地`;
    case 'ACTIVATE_DISCOVERED_LEVEL1_SITE': return '激活一个已发现的一级地点';
    case 'ACTIVATE_OWN_OCCUPIED_SITE': return '激活一个有自己考古学家的地点';
    case 'ACTIVATE_TOP_SITE_DECK': return `激活一级地点牌堆顶并放回底部`;
    case 'OVERCOME_GUARDIAN_FREE': return '免费击败一个符合条件的守卫';
    case 'BUY_WITH_DISCOUNT': return `购买物品少付 ${value.itemDiscount} 金币 / 神器少付 ${value.artifactDiscount} 罗盘`;
    case 'BUY_ITEM_DISCOUNT_INCLUDE_TOP': return `以 ${value.discount} 金币折扣购买市场或牌堆顶物品`;
    case 'ACQUIRE_MARKET_ITEM': return `免费获得市场物品并放入${value.destination === 'hand' ? '手牌' : '牌库顶'}`;
    case 'ACTIVATE_AVAILABLE_ASSISTANT': return `触发供给区一个${value.level === 'silver' ? '银色' : '金色'}助手`;
    case 'EXCHANGE_ASSISTANT_WITH_AVAILABLE': return '将自己的一个助手与供给区助手交换';
    case 'EXILE_RIGHTMOST_ITEM_GAIN_EXILED_ITEM': return '放逐最右物品，并获得一张已放逐物品';
    case 'RETURN_OCCUPIED_WORKER_THEN': return `收回一个已放置考古学家：${effects(value.effects)}`;
    case 'RETURN_SLOTTED_IDOL': return '收回一个已嵌入的神像';
    case 'MOVE_OCCUPIED_WORKER_THEN_ACTIVATE': return '移动一个已放置考古学家并激活目标地点';
    case 'MOVE_GUARDIAN_FROM_OWN_SITE_THEN_ACTIVATE': return '移动自己地点上的守卫并激活目标地点';
    case 'REDUCE_NEXT_SITE_ACTION_COST': return `下次地点行动少付 ${value.plane} 飞机`;
    case 'ALL_TRAVEL_ICONS_ARE_PLANES_THIS_ROUND': return '本回合所有旅行图标视为飞机';
    case 'PASS_IMMEDIATELY_GAIN': return `获得 ${bundle(value.gain)}，并立刻跳过`;
    case 'REFRESH_ASSISTANTS_THEN': return `重置 ${value.amount} 个助手：${effects(value.effects)}`;
    case 'IGNORE_GUARDIAN_FEAR_THIS_ROUND': return '本回合不因守卫获得恐惧';
    default: return `已录入引擎语义：${value.type}`;
  }
}

export const baseCardEffectSummaries: Record<string, string> = Object.fromEntries(
  Object.entries((manual as ManualData).effects).map(([id, values]) => [id, effects(values)]),
);
