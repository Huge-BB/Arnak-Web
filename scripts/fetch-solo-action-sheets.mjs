import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';

const sheets = {
  '55': { url:'https://steamusercontent-a.akamaihd.net/ugc/1862807092238653123/9215C3CC6F7FF68DDA6A270A6B7F94320E84F7BC/', columns:4, rows:3 },
  '56': { url:'https://steamusercontent-a.akamaihd.net/ugc/1862807092238653236/FFA0BEA354306F8472672F34B791174D57A97387/', columns:5, rows:2 },
};
const cards = {
  'dig-coin':['55',0],'dig-tablet':['55',1],'dig-jewel':['55',2],'discover-green':['55',3],'discover-red':['55',4],'buy-item-red':['55',5],'buy-artifact-red':['55',6],'buy-item-green':['55',7],'research-green':['55',9],'buy-artifact-green':['55',10],
  'dig-compass':['56',0],'dig-arrowhead':['56',1],'research-red':['56',2],'overcome-red':['56',3],'overcome-green':['56',4],
};
const directory = resolve('public/assets/solo-actions');
await mkdir(directory, { recursive: true });
const source = {};
for (const [id, sheet] of Object.entries(sheets)) {
  const response = await fetch(sheet.url);
  if (!response.ok) throw new Error(`Unable to fetch solo action sheet ${id}: ${response.status}`);
  const image=sharp(Buffer.from(await response.arrayBuffer())),metadata=await image.metadata();
  if(!metadata.width||!metadata.height)throw new Error(`Solo action sheet ${id} has no dimensions`);
  source[id]={ image,width:metadata.width,height:metadata.height,columns:sheet.columns,rows:sheet.rows };
}
for(const [tileId,[sheetId,index]] of Object.entries(cards)){
  const sheet=source[sheetId],column=index%sheet.columns,row=Math.floor(index/sheet.columns),left=Math.floor(sheet.width/sheet.columns*column),top=Math.floor(sheet.height/sheet.rows*row),width=Math.floor(sheet.width/sheet.columns*(column+1))-left,height=Math.floor(sheet.height/sheet.rows*(row+1))-top;
  // Rival tiles are portrait rectangles. Squaring them with `cover` removed
  // the arrows and most printed information from the localized asset.
  await sheet.image.clone().extract({left,top,width,height}).resize({width:192}).webp({quality:86}).toFile(resolve(directory,`${tileId}.webp`));
}
