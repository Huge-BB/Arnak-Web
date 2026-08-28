import type {
  ResearchBoardId,
  ResearchBridgeDefinition,
  ResearchCost,
  ResearchManualData,
  ResearchNodeDefinition,
  ResearchTrackDefinition,
} from './types.ts';

const COST_KEYS = ['coin', 'compass', 'tablet', 'arrowhead', 'jewel', 'usableIdol', 'discardCard'] as const;
function validateCost(cost: ResearchCost, label: string) { for (const key of COST_KEYS) { const value=cost[key]; if (value!==undefined && (!Number.isInteger(value)||value<0)) throw new Error(`${label} has invalid ${key} cost`); } }
function bridgeKey(from:string,to:string){return `${from}->${to}`;}
function allNodes(track:ResearchTrackDefinition):ResearchNodeDefinition[]{return track.rows.flatMap(row=>row.nodes??[]);}
export const researchTempleNode=(boardId:string)=>`${boardId}:temple`;
function validateNodeOverride(node:ResearchNodeDefinition,label:string){ if(!Number.isInteger(node.researchLevel)||node.researchLevel<0) throw new Error(`${label} has invalid researchLevel`); if(node.spansLevels!==undefined){ if(node.spansLevels.length===0||node.spansLevels.some(level=>!Number.isInteger(level)||level<0)) throw new Error(`${label} has invalid spansLevels`); if(new Set(node.spansLevels).size!==node.spansLevels.length) throw new Error(`${label} has duplicate spansLevels`); } }

export function applyResearchManualData(track:ResearchTrackDefinition,manualData:ResearchManualData,options:{requireVerified?:boolean}={}):ResearchTrackDefinition{
 const boardId=track.id as ResearchBoardId; const overlay=manualData.boards[boardId]; const next=structuredClone(track); delete next.templeArrivalPoints; if(!overlay) return next;
 const requireVerified=options.requireVerified??false; const nodes=new Map(allNodes(next).map(node=>[node.id,node])); const bridges=next.bridges??[]; const topology=new Map(bridges.map(bridge=>[bridgeKey(bridge.from,bridge.to),bridge])); const seenBridges=new Set<string>(); const seenNodes=new Set<string>();
 if(overlay.templeArrivalPoints!==undefined){ if(overlay.templeArrivalPoints.length!==4||overlay.templeArrivalPoints.some(v=>!Number.isInteger(v)||v<0)) throw new Error(`${boardId}: templeArrivalPoints must contain four non-negative integers`); next.templeArrivalPoints=[...overlay.templeArrivalPoints] as [number,number,number,number]; }
 for(const manualNode of overlay.nodeOverrides??[]){ if(seenNodes.has(manualNode.node)) throw new Error(`Duplicate manual research node override: ${manualNode.node}`); seenNodes.add(manualNode.node); const target=nodes.get(manualNode.node); if(!target) throw new Error(`Manual research node does not exist in ${boardId} topology: ${manualNode.node}`); if(requireVerified&&!manualNode.verified) throw new Error(`Research node is not verified: ${manualNode.node}`); if(manualNode.researchLevel!==undefined) target.researchLevel=manualNode.researchLevel; if(manualNode.spansLevels!==undefined) target.spansLevels=[...manualNode.spansLevels]; validateNodeOverride(target,manualNode.node); }
 for(const manualBridge of overlay.bridges){ const key=bridgeKey(manualBridge.from,manualBridge.to); if(seenBridges.has(key)) throw new Error(`Duplicate manual research bridge: ${key}`); seenBridges.add(key); let target=topology.get(key); if(!target&&manualBridge.to===researchTempleNode(boardId)&&nodes.has(manualBridge.from)){target={id:key,from:manualBridge.from,to:manualBridge.to};bridges.push(target);topology.set(key,target);} if(!target) throw new Error(`Manual research bridge does not exist in ${boardId} topology: ${key}`); validateCost(manualBridge.cost,key); if(requireVerified&&!manualBridge.verified) throw new Error(`Research bridge is not verified: ${key}`); target.cost={...manualBridge.cost}; if(manualBridge.allowedTokens!==undefined)target.allowedTokens=[...manualBridge.allowedTokens]; target.verified=manualBridge.verified; }
 return next;
}
export function findResearchBridge(track:ResearchTrackDefinition,from:string,to:string):ResearchBridgeDefinition{const bridge=(track.bridges??[]).find(candidate=>candidate.from===from&&candidate.to===to);if(!bridge)throw new Error(`Illegal research bridge: ${from}->${to}`);return bridge;}
export function findResearchNode(track:ResearchTrackDefinition,nodeId:string):ResearchNodeDefinition{const node=allNodes(track).find(candidate=>candidate.id===nodeId);if(!node)throw new Error(`Unknown research node: ${nodeId}`);return node;}
export function assertVerifiedResearchBridge(bridge:ResearchBridgeDefinition){if(!bridge.verified)throw new Error(`Research bridge has not been verified: ${bridge.id}`);validateCost(bridge.cost??{},bridge.id);}
