import {validatePerson} from './people.mjs';

// Fictional registration data only. Shared contacts describe a sample family;
// they never create or authorize a family/account link.
const surnames=[['陳','Chan'],['林','Lam'],['黃','Wong'],['張','Cheung'],['李','Lee'],['王','Wang'],['何','Ho'],['吳','Ng'],['劉','Lau'],['梁','Leung'],['鄭','Cheng'],['周','Chow'],['徐','Tsui'],['謝','Tse'],['馬','Ma'],['馮','Fung'],['郭','Kwok'],['楊','Yeung'],['曾','Tsang'],['許','Hui'],['羅','Lo'],['蔡','Choi'],['唐','Tong'],['杜','To'],['沈','Shum'],['葉','Yip'],['姚','Yiu'],['譚','Tam'],['江','Kong'],['洪','Hung']];
const englishNames={
 Female:'Abigail Ada Adele Aileen Alice Alison Amelia Amy Andrea Angela Anna Annabelle Audrey Aurora Ava Beatrice Bella Bethany Bianca Bridget Caitlin Camille Cara Caroline Catherine Cecilia Charlotte Chloe Clara Claudia Cora Daisy Daphne Delia Eleanor Elena Eliza Elizabeth Eloise Emily Emma Erica Esther Eva Evelyn Faith Felicity Fiona Florence Frances Gabrielle Georgia Grace Hannah Hazel Helena Holly Imogen Ingrid Irene Iris Isabel Ivy Jasmine Joanna Josephine Julia Juliet Katherine Kayla Laura Lauren Leah Lena Lily Lucy Lydia Madeleine Maisie Margaret Maria Maya Megan Melissa Mia Michelle Naomi Natalie Nicole Nora Olivia Paige Penelope Phoebe Rachel Rebecca Rose Ruby Sabrina Samantha Sarah Serena Shannon Sienna Sophie Stella Summer Sylvia Teresa Thea Tiffany Valerie Vanessa Vera Victoria Violet Vivian Zoe'.split(' '),
 Male:'Aaron Adam Adrian Aidan Alan Albert Alexander Alfred Andrew Anthony Arthur Asher Austin Benjamin Blake Brandon Brian Caleb Calvin Cameron Charles Christian Christopher Colin Connor Daniel David Declan Dennis Dominic Dylan Edward Edwin Eli Elijah Elliott Emmett Eric Ethan Evan Felix Finn Francis Frederick Gabriel Gavin George Graham Gregory Harrison Henry Hugo Ian Isaac Ivan Jack Jacob James Jason Jasper Jeremy Joel Jonathan Joseph Joshua Julian Justin Kai Keith Kenneth Kevin Kieran Lawrence Leo Liam Louis Lucas Luke Marcus Martin Matthew Maxwell Michael Miles Nathan Nicholas Noah Nolan Oliver Oscar Owen Patrick Paul Peter Philip Quentin Raphael Raymond Richard Robert Ronan Ryan Samuel Sebastian Simon Spencer Stephen Theodore Thomas Timothy Tobias Tristan Victor Vincent Wesley William Xavier Zachary'.split(' '),
};
const femaleFirst='曉梓芷思詠欣雅悅映若語可希晴穎嘉心靜沛允予安彥宥以柔韻婉倩舒'.split(''),femaleLast='晴琳澄妍恩穎悠彤瑤柔怡悅希喬嵐珊琪凝芮童欣蘭敏茵桐萱蕊然璇寧'.split('');
const maleFirst='子梓俊睿樂柏昊卓奕皓諾沛允宥天宇彥承博頌希澄景晉浩嘉智健思明'.split(''),maleLast='軒熙謙言朗然澤宇承衡皓賢彥逸博睿霖謹航峰德恆廷傑睦勤哲辰嵐恩'.split('');
const motherFirst='嘉佩淑慧美麗穎敏婉思雅詠紫曉惠珮潔靜晴文'.split(''),motherLast='雯欣玲儀芬華珊敏琪彤君妍茵姿容瑩琳蘭瑤怡'.split('');
const fatherFirst='志偉文家德國振啟俊建明健浩嘉思榮承子耀卓'.split(''),fatherLast='明強輝成傑華良軒倫康毅樂恆雄俊霖達興彥安'.split('');
const districts=['九龍城','沙田','荃灣','觀塘','大埔','屯門','東區','灣仔'];
const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&value>='0001-01-01'&&value<='9999-12-31'&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
const ageAt=(birthDate,date)=>Number(date.slice(0,4))-Number(birthDate.slice(0,4))-(date.slice(5)<birthDate.slice(5)?1:0);
const hash=text=>{let number=2166136261;for(const char of text)number=Math.imul(number^char.charCodeAt(0),16777619);return number>>>0;};
const pad=number=>String(number).padStart(3,'0');
function education(age,family){
 const variant=family.index%3,prefix=family.district;
 if(age<6)return {school:prefix+['晨光幼稚園','青禾幼稚園','海晴幼稚園'][variant],level:'K'+Math.max(1,age-2)};
 if(age<12)return {school:prefix+['星橋小學','青嶺小學','海晴小學'][variant],level:'P'+(age-5)};
 return {school:prefix+['星橋書院','青嶺中學','海晴中學'][variant],level:'S'+Math.min(6,age-11)};
}
function familyRecord(index,ordinals){
 const [surname,lastName]=index===0?['何','Ho']:surnames[(index*7+Math.floor(index/30))%surnames.length],district=districts[index%districts.length];
 const motherGiven=motherFirst[index%motherFirst.length]+motherLast[Math.floor(index/motherFirst.length)%motherLast.length],fatherGiven=fatherFirst[index%fatherFirst.length]+fatherLast[Math.floor(index/fatherFirst.length)%fatherLast.length];
 const [motherSurname,motherLastName]=index===0||index%10===0?[surname,lastName]:surnames[(surnames.findIndex(row=>row[0]===surname)+1+index%29)%surnames.length];
 const contact1Name=index===0?'何嘉敏 Carmen Ho':motherSurname+motherGiven+' '+englishNames.Female[(index*11)%englishNames.Female.length]+' '+motherLastName,contact2Name=index===0?'何志明 Daniel Ho':surname+fatherGiven+' '+englishNames.Male[(index*13)%englishNames.Male.length]+' '+lastName;
 const contact1Phone='+852 0000 '+String(1001+index).padStart(4,'0'),contact2Phone='+852 0000 '+String(5001+index).padStart(4,'0'),contact1Email=index===0?'chloe.guardian@example.test':`family-${pad(index+1)}.guardian@example.test`,contact2Email=index===0?'chloe.emergency@example.test':`family-${pad(index+1)}.emergency@example.test`;
 return {index,key:'demo-family-'+pad(index+1),ordinals,surname,lastName,district,parentName:contact1Name,contact1Name,contact1Phone,contact1Email,contact2Name,contact2Phone,contact2Email,phone:contact1Phone,mobile:contact1Phone,whatsApp:contact1Phone,address:`${district} ${['映禾街','晴川路','翠嵐道','雲橋街','澄月路','柏庭道','青沐街','朗晴路'][index%8]} ${2+index*2} 號 ${['晨光花園','青禾苑','海晴花園'][index%3]} ${1+index%4} 座 ${3+hash('floor:'+index)%23} 樓 ${['A','B','C','D'][index%4]} 室`,billName:contact1Name};
}
function makeFamilies(){
 const families=[familyRecord(0,[0])],pattern=[1,1,1,1,1,1,1,1,1,1,1,1,2,2,3];let ordinal=1;
 while(ordinal<300){const index=families.length,size=Math.min(pattern[(index-1)%pattern.length],300-ordinal),ordinals=Array.from({length:size},(_,offset)=>ordinal+offset);families.push(familyRecord(index,ordinals));ordinal+=size;}
 return families;
}
const families=makeFamilies(),cohort=[];
const chineseGivenNames=new Set(['詠晴']),englishFullNames=new Set(['Chloe Ho']),chineseCursor={Female:0,Male:0},englishCursor={Female:0,Male:0};
function studentName(gender,family){
 const first=gender==='Female'?femaleFirst:maleFirst,last=gender==='Female'?femaleLast:maleLast;let givenName;
 do{const cursor=chineseCursor[gender]++,firstIndex=cursor%first.length;let lastIndex=(Math.floor(cursor/first.length)+firstIndex*7)%last.length;if(first[firstIndex]===last[lastIndex])lastIndex=(lastIndex+1)%last.length;givenName=first[firstIndex]+last[lastIndex];}while(chineseGivenNames.has(givenName));chineseGivenNames.add(givenName);
 let firstName,fullName;do{firstName=englishNames[gender][englishCursor[gender]++%englishNames[gender].length];fullName=firstName+' '+family.lastName;}while(englishFullNames.has(fullName));englishFullNames.add(fullName);
 return {displayName:family.surname+givenName,localName:family.surname+givenName,firstName,lastName:family.lastName,fullName};
}
for(const family of families)for(const [siblingIndex,ordinal]of family.ordinals.entries()){
 const gender=ordinal===0?'Female':(hash('gender:'+ordinal)>>>12)%2?'Female':'Male',name=ordinal===0?{displayName:'何詠晴 Chloe Ho',localName:'何詠晴',firstName:'Chloe',lastName:'Ho',fullName:'Chloe Ho'}:studentName(gender,family),gap=2+family.index%2;
 const eldestAge=family.ordinals.length===1?3+(family.index*7+Math.floor(family.index/16))%16:family.ordinals.length===2?6+family.index*7%13:9+family.index*7%10;
 cohort[ordinal]={family,siblingIndex,ordinal,gender,...name,age:eldestAge-siblingIndex*gap};
}
// Planning metadata is not an account-access source or a persisted family link.
export const demoStudentFamilyPlan=Object.freeze(families.map(({key,ordinals,contact1Email})=>Object.freeze({key,ordinals:Object.freeze([...ordinals]),contact1Email})));
function birthday(student,startDate){
 if(student.ordinal===0)return '2017-04-18';
 const month=1+(hash('birth-month:'+student.ordinal)>>>8)%12,maxDay=month===2?28:[4,6,9,11].includes(month)?30:31,day=1+(hash('birth-day:'+student.ordinal)>>>8)%maxDay,monthDay=String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0'),year=Number(startDate.slice(0,4))-student.age-(monthDay>startDate.slice(5)?1:0);
 if(year<1)throw new Error('The sample start date is too early for the requested student age range.');return String(year).padStart(4,'0')+'-'+monthDay;
}
function learningInterests(ordinal,age){
 const choose=(pool,salt)=>pool[(hash(salt+':'+ordinal)>>>5)%pool.length],group=age<6?'preschool':age<12?'child':'teen';
 const subjects={preschool:['圓形與方形','花朵與葉子','彩虹與雲朵','森林小動物','海底世界','喜歡的玩具','四季顏色','水果與蔬菜','交通工具','恐龍故事','家中的寵物','童話城堡'],child:['動物姿態','海洋生態','昆蟲與植物','太空與星球','城市建築','故事場景','卡通角色','交通工具','節日佈置','四季風景','夢想房間','運動場景','科學小發明','街市生活'],teen:['人物動作','靜物與材質','城市街景','自然光影','建築空間','敘事插畫','角色設計','海報排版','環境與生態','日常生活片段','產品造型','舞台場景','書籍封面','旅行速寫','抽象色彩','生活攝影構圖']};
 const media={preschool:['手指畫','海綿拓印','大畫筆塗色','撕紙拼貼','輕黏土造型','印章創作','蠟筆疊色','滾輪畫','紙盤手作','自然素材拼貼'],child:['水彩','油粉彩','色鉛筆','拼貼','紙雕','輕黏土','印版拓印','速寫','混合媒材','水墨','紙模型','簡單版畫'],teen:['鉛筆素描','炭筆','透明水彩','壓克力','代針筆','色鉛筆','水墨','混合媒材','拼貼設計','紙材雕塑','版畫','速寫手帳']};
 const goals={preschool:['顏色辨認','簡單形狀組合','手眼協調','材料觸感探索','觀察不同紋理','大幅線條表達','輪流分享材料','說出作品故事','辨認明暗顏色','耐心完成小作品'],child:['構圖安排','色彩混合','細節觀察','立體空間感','角色表情','材質表現','故事連貫','線條控制','圖形設計','完成作品計劃'],teen:['比例與透視','明暗層次','色彩關係','視覺敘事','作品系列規劃','材質觀察','設計思考','構圖節奏','個人風格探索','作品整理與呈現','獨立創作計劃','表達創作概念']};
 const preferences={preschool:['喜歡先看短示範再嘗試','偏好可觸摸的材料','喜歡在故事後開始創作','習慣用較大的畫紙','樂於介紹作品中的角色','喜歡嘗試鮮明顏色','對印章和拓印特別好奇','喜歡將作品帶回家分享','享受簡短而清楚的步驟','願意和同學分享材料'],child:['喜歡先畫草圖再上色','樂於嘗試不同畫材','喜歡從生活觀察尋找題材','偏好一步一步完成作品','願意向同學介紹創作想法','喜歡把閱讀內容畫成故事','對立體造型特別好奇','喜歡在示範後自行變化','習慣收集參考圖片','樂於討論不同的色彩配搭'],teen:['希望有較多自主選題空間','喜歡研究作品背後的想法','習慣先整理視覺參考','願意接受具體的修改建議','偏好完成較長期的創作','對不同藝術家表達方式有興趣','喜歡結合生活觀察與想像','希望逐步整理個人作品','樂於嘗試新的材料組合','喜歡在課後延伸創作']};
 const subject=choose(subjects[group],'subject'),medium=choose(media[group],'medium'),goal=choose(goals[group],'goal'),preference=choose(preferences[group],'preference');
 const detail=choose([`喜歡觀察${subject}，希望嘗試${medium}。`,`對${subject}題材有興趣，想透過${medium}練習${goal}。`,`希望以${medium}創作${subject}作品，並加強${goal}。`,`目前想探索${subject}，以${medium}記錄自己的想法。`],'detail-template');
 const ending=choose([`希望逐步練習${goal}。`,`希望在課堂中逐步加強${goal}。`,`適合在課堂中加入${subject}的探索。`,`想繼續嘗試${medium}的表現方法。`],'remark-ending');
 return {detail,remark:ordinal===0?'喜歡水彩和拼貼創作。':preference+'；'+ending};
}
function profileFor(ordinal,startDate){
 if(!Number.isSafeInteger(ordinal)||ordinal<0||ordinal>=300||!validDate(startDate))throw new Error('Choose an owned student ordinal and valid sample start date.');
 const student=cohort[ordinal],{family}=student,dateOfBirth=birthday(student,startDate),{displayName,firstName,lastName,fullName,localName,gender}=student;
 const contactFields=Object.fromEntries(['parentName','contact1Name','contact1Phone','contact1Email','contact2Name','contact2Phone','contact2Email','district','address','whatsApp','phone','mobile','billName'].map(key=>[key,family[key]]));
 return validatePerson({displayName,firstName,lastName,fullName,localName,gender,dateOfBirth,email:ordinal===0?'chloe.ho@example.test':`${firstName.toLowerCase()}.${lastName.toLowerCase()}.${pad(ordinal)}@example.test`,...contactFields,...education(ageAt(dateOfBirth,startDate),family),...learningInterests(ordinal,ageAt(dateOfBirth,startDate)),enrollmentDate:startDate,quitDate:null,occupation:'學生',referrer:['','朋友介紹','中心網站','社交平台','家長介紹'][family.index%5],promotion:family.index%4===0?null:false});
}
export const relationalStudentProfile=(index,startDate)=>{if(!Number.isSafeInteger(index)||index<0||index>=299)throw new Error('Choose an owned student index.');return profileFor(index+1,startDate);};
export const chloeStudentProfile=startDate=>profileFor(0,startDate);

export const namedTeacherDemoProfiles=Object.freeze([
 {key:'maya',displayName:'林雅晴 Maya Lam',staffNumber:'ST-001',fullName:'Maya Lam',localName:'林雅晴',gender:'female',dateOfBirth:'1988-09-12',position:'中心主管兼藝術導師',employment:'full-time',joined:'2021-08-02',contactEmail:'maya.lam@example.test',phone:'+852 0000 9001',mobile:'+852 0000 9101',detail:'負責幼兒及兒童創意藝術教學與課程統籌。',remarks:'可使用中文及英文溝通。'},
 {key:'leo',displayName:'陳子朗 Leo Chan',staffNumber:'ST-002',fullName:'Leo Chan',localName:'陳子朗',gender:'male',dateOfBirth:'1993-03-21',position:'藝術導師',employment:'full-time',joined:'2022-09-01',contactEmail:'leo.chan@example.test',phone:'+852 0000 9002',mobile:'+852 0000 9102',detail:'教授創意繪畫、水彩及拼貼，重視學生觀察與表達。',remarks:'喜歡以示範及個別回饋引導學生。'},
 {key:'ava',displayName:'許悅童 Ava Hui',staffNumber:'ST-003',fullName:'Ava Hui',localName:'許悅童',gender:'female',dateOfBirth:'1995-08-07',position:'水彩及繪本導師',employment:'part-time',joined:'2023-02-06',contactEmail:'ava.hui@example.test',phone:'+852 0000 9003',mobile:'+852 0000 9103',detail:'擅長水彩、敘事插畫及繪本創作。',remarks:'教學時鼓勵學生整理自己的故事。'},
 {key:'ethan',displayName:'鄭思澄 Ethan Cheng',staffNumber:'ST-004',fullName:'Ethan Cheng',localName:'鄭思澄',gender:'male',dateOfBirth:'1990-12-05',position:'素描及立體創作導師',employment:'part-time',joined:'2020-10-05',contactEmail:'ethan.cheng@example.test',phone:'+852 0000 9004',mobile:'+852 0000 9104',detail:'教授素描基礎、材料研究及立體造型。',remarks:'重視安全使用工具及作品製作過程。'},
].map(Object.freeze));
