import type { CardId, EngineContext, TravelCost, TravelIcon } from './types.ts';

const ICONS: TravelIcon[] = ['boot', 'car', 'boat', 'plane'];
export type TravelPool = Record<TravelIcon, number>;

function emptyTravel():TravelPool{return {boot:0,car:0,boat:0,plane:0};}
export function totalCardTravel(cardIds: CardId[], context: EngineContext): TravelPool {
  const total = emptyTravel();
  for (const cardId of cardIds) {
    const card = context.cards[cardId];
    if (!card) throw new Error(`Unknown travel card: ${cardId}`);
    for (const icon of ICONS) total[icon] += card.travel?.[icon] ?? 0;
  }
  return total;
}
function addTravel(a:TravelCost={},b:TravelCost={}):TravelPool{const total=emptyTravel();for(const icon of ICONS)total[icon]=(a[icon]??0)+(b[icon]??0);return total;}

/** Return one valid amount of temporary travel consumed by this payment, preferring card icons first. */
export function planTravelPayment(cost:TravelCost={},cardIds:CardId[],context:EngineContext,temporary:TravelCost={},options:{allIconsArePlanes?:boolean}={}):TravelCost|undefined{
  const rawCards=totalCardTravel(cardIds,context),rawTemporary=addTravel(temporary),allIconsArePlanes=options.allIconsArePlanes===true;
  const cards=allIconsArePlanes?{...emptyTravel(),plane:ICONS.reduce((total,icon)=>total+rawCards[icon],0)}:rawCards;
  const temporaryPool=allIconsArePlanes?{...emptyTravel(),plane:ICONS.reduce((total,icon)=>total+rawTemporary[icon],0)}:rawTemporary;
  const available=addTravel(cards,temporaryPool),remaining={...cost};
  // Payment hierarchy: plane only pays plane; car/boat/plane pay boots; plane substitutes car/boat.
  const use=(icon:TravelIcon,needIcon:TravelIcon,amount:number)=>{if(amount<=0)return;const take=Math.min(available[icon],amount);available[icon]-=take;(remaining[needIcon]??=0);remaining[needIcon]=Math.max(0,(remaining[needIcon]??0)-take);};
  use('plane','plane',remaining.plane??0);
  use('car','car',remaining.car??0);use('plane','car',remaining.car??0);
  use('boat','boat',remaining.boat??0);use('plane','boat',remaining.boat??0);
  use('boot','boot',remaining.boot??0);use('car','boot',remaining.boot??0);use('boat','boot',remaining.boot??0);use('plane','boot',remaining.boot??0);
  if(ICONS.some(icon=>(remaining[icon]??0)>0))return undefined;
  const combined=addTravel(cards,temporaryPool),used=emptyTravel();for(const icon of ICONS)used[icon]=combined[icon]-available[icon];
  const temporaryUsed:TravelCost={};for(const icon of ICONS){const amount=Math.max(0,used[icon]-cards[icon]);if(amount)temporaryUsed[icon]=amount;}
  if(allIconsArePlanes&&temporaryUsed.plane){
    let remainingTemporary=temporaryUsed.plane;delete temporaryUsed.plane;
    for(const icon of ['plane','car','boat','boot'] as TravelIcon[]){const amount=Math.min(remainingTemporary,rawTemporary[icon]);if(amount){temporaryUsed[icon]=amount;remainingTemporary-=amount;}if(!remainingTemporary)break;}
  }
  return temporaryUsed;
}

export function canPayTravel(cost: TravelCost = {}, cardIds: CardId[], context: EngineContext, temporary:TravelCost={}): boolean {
  return planTravelPayment(cost,cardIds,context,temporary)!==undefined;
}

export function hasTravelCost(cost: TravelCost = {}): boolean {
  return ICONS.some(icon => (cost[icon] ?? 0) > 0);
}
