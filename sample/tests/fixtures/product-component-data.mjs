import * as operations from '../../client/operations-ui.js';
import {createInterfacePreview as createPreview} from '../../client/interface-preview.js';

// Explicit component-test records, never imported by the running application.
export const products=[
  {id:'product-1',sku:'ART-001',nameZh:'A4 素描畫簿',nameEn:'Sketchbook A4',category:'materials',price:48,cost:26,stock:32,threshold:8,status:'active',description:'180 gsm 紙張，適合鉛筆與炭筆練習。',descriptionEn:'180 gsm paper for pencil and charcoal studies.'},
  {id:'product-2',sku:'ART-002',nameZh:'學生水彩套裝',nameEn:'Watercolour set',category:'materials',price:128,cost:72,stock:4,threshold:6,status:'active',description:'12 色水彩、畫筆及調色盤。',descriptionEn:'12 colours, a brush and a mixing palette.'},
  {id:'product-3',sku:'KIT-001',nameZh:'創作工具袋',nameEn:'Creative toolkit',category:'kits',price:168,cost:94,stock:0,threshold:4,status:'active',description:'課堂基本繪畫及手作工具。',descriptionEn:'a set of drawing and craft essentials.'},
  {id:'product-4',sku:'ART-003',nameZh:'陶藝圍裙',nameEn:'Studio apron',category:'accessories',price:88,cost:42,stock:16,threshold:4,status:'draft',description:'可調節肩帶的棉質圍裙。',descriptionEn:'cotton apron with adjustable straps.'}
 ];
export function getOperationsPreviewData(){return {...operations.getOperationsPreviewData(),products:structuredClone(products)};}
const stateWithData=state=>({...state,data:{...getOperationsPreviewData(),...(state?.data||{})}});
export const operationsPageMarkup=(section,state,ctx)=>operations.operationsPageMarkup(section,stateWithData(state),ctx);
export const operationsDialogMarkup=(state,ctx)=>operations.operationsDialogMarkup(stateWithData(state),ctx);
export function createInterfacePreview(options){
 const context=options.context;
 if(context()?.productsContext!==undefined)return createPreview(options);
 return createPreview({...options,context:()=>({productsContext:{status:'ready',records:structuredClone(products)},...context()})});
}
