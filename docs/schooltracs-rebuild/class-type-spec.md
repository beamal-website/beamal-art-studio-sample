# 正式課堂類型與新班次規則

制定：2026-10-15，修改程式前。依 Notion §5.5 第99行／C-06及§5.3的類型篩選；完整 SchoolTracs＋Notion Goal、其他核心缺口及300 active驗收繼續。Chrome本日實際Add schedule表單沒有觀察到此欄位，只有查看並Cancel；這是Notion追加要求，不宣稱SchoolTracs已提供相同設定。

## 效果、已知與假設

Admin可維護Regular、Special及自訂類型名稱，明確設定「允許學生自行申請調課」為允許／禁止／尚未設定。Regular／Special名稱不代表既定政策；兩個預設類型的規則初始null，不硬編Special禁止。Teacher只讀，不增加權限。Course可選新排課預設類型；Create Class可沿用課程預設或明確另選／清除。自訂類型本身就是可選的文字標籤，不另加尚未定義的多標籤或2/6進度。

舊Course／Schedule缺類型＝未指定，不按category、老師名字、session或count猜。新排課複製類型的當時規則快照，類型目錄修改只影響日後新選用，不偷偷改已有班次或歷史。Admin可在Edit中明確改用目前目錄版本；選「保留目前」或省略欄位會保留原快照及其他堂的例外。Course預設修改亦不回寫已有排課。

只配置規則，沒有學生自助調課／正式StudentSession可供執行；下一段調課流程必須由服務核對快照，不可僅靠畫面按鈕。本片不宣稱已完成例外授權、C-06整個業務規則、C-07班內學生資料或Enrollment／Attendance。

## 技術合約

沿用sample Vite／原生JS、Node HTTP／SQLite、現有身份／CSRF／Origin／交易及固定operation key。不增依賴、Login、ACL、CI、圖片或main改動。新增class_types及audit；Regular／Special用固定ID種子，custom新UUID。Type DTO：`{id,kind:'regular'|'special'|'custom',name,studentReschedulingAllowed:null|boolean,active,version,createdAt,updatedAt}`。預設kind不可改，名稱可改；名稱trim後1–200字、同名拒絕，規則嚴格三態。inactive不能作新選擇，已有快照可保留。

- `GET /api/class-types[?since=revision]`：Admin／Teacher，回`{revision,types}`或unchanged；Student／匿名拒絕。只傳設定，不帶人物、課程或全校排課資料。
- `POST /api/class-types`：Admin，`{name,studentReschedulingAllowed,active}`；kind固定custom。201`{type}`，operation key重試只建立一次。
- `PATCH /api/class-types/:id`：Admin，`{version,name,studentReschedulingAllowed,active}`；200`{type}`。版本衝突409、交易/audit/重試保持一致。
- Course create/metadata update接受optional `classTypeId:null|ID`與選用ID時的`classTypeVersion`。不存在／停用／過期目錄版本拒絕；省略保留原預設，null明確清除。Course DTO只保存/呈現default ID，不把rule快照寫進Course；舊及public欄位不擅自擴張。
- Schedule寫入接受optional `classTypeId:null|ID`、`classTypeVersion`。真保存的`classType`快照由服務生成：`{id,kind,name,studentReschedulingAllowed,version}`或null；客戶不能提交或偽造快照／規則。新排課省略ID會沿用當下Course預設；本版UI沿用預設時另送`classTypeCourseVersion`及`classTypeVersion`（未指定為0），服務驗開表來源避免背景改預設或規則後誤用。
- Schedule編輯省略以上欄位保留選定堂的classType；明確選ID須current Type版本，明確null清除。單堂只改同sequence；Following只將實際改過的類型套往後，時間-only不得抹去另堂Type例外；更改repeat亦保留現有例外。整套Edit既有seg/exception仍409。cancel/Undo、移日、換老師不改快照。Duplicate新ID使用目前啟用目錄的同類型及當時規則，顯示此意義；若原類型停用，須明確重新選用，不暗中降為Regular或無類型。
- 授權Teacher Schedule DTO、shared occurrence投影與private linked Slot傳同堂classType；Standalone不借類型，public DTO及revision不增加私人設定。共享範圍和手動Full資料不變。

基本程式風格沿用現有直白函式：

```js
if (Object.hasOwn(input, 'classTypeId')) {
  if (input.classTypeId === null) return null;
  return classTypes.snapshot(input.classTypeId, input.classTypeVersion);
}
return current?.classType ?? null;
```

實際新建的Course預設繼承另行處理，不能用以上Edit片段推論新建無類型。

## UI與同步

課程Create／Edit與排課Create／Edit加入清楚類型選擇、目前規則摘要；保留現有價錢及重複欄位。排課Edit預設「保留目前」，Create預設「沿用課程預設」。新增「課堂類型設定」管理入口，三態規則有明確未知文字，停用類型仍在設定清單及已有快照顯示。普通課詳情與列表顯示種類／規則，五檢視可由類型篩選，篩選不改資料或訪問權限。Bilingual、390手機、焦點圈、Cancel／Escape／Back不保存。

背景讀取按revision合併，草稿開啟後凍結可選目錄版本及來源Course版本；409保留輸入，不暗中改規則重送。保存顯pending並禁重按；ACK直接顯已確認結果，後續讀失敗保留成功資料；identity/route切換後舊ACK不得污染新表單。Teacher可查看自己/獲授權堂的快照，不可編輯設定／類型指派。

停用的Course預設仍以歷史選項顯示；瀏覽器提交時可能省略被停用的已選選項，因此缺欄位必須從開表時凍結的Course預設保留，不能當成使用者明確選擇清除。稍後開啟或關閉的視窗會撤銷較早、仍在等待讀取的開窗意圖；共用讀取完成或失敗時，當前設定視窗都必須解除載入狀態，讓使用者可以關閉或重新載入。這兩項是獨立驗收發現並補入的永久回歸要求。

## 分工與驗證

Backend worker負責class-types.mjs／store／validation／schedules／access-control／available-slots／app及shared occurrence投影與對應真HTTP tests。UI worker負責pure class-type-ui.js、CSS及pure tests。獨立QA負責SDK/flow tests先RED；Root負責API client/runtime接線、benchmark module複製、研究與docs、真正瀏覽器及Git。每人不撤回他人改動。

先有意義RED，再最小GREEN；單堂／Following／repeat／legacy omission／停用保留／settings版本競爭／來源Course版本／跨角色／跨身份／取消／晚ACK／public界線必須驗。類型config沒有執行調課業務的測試不可冒充它。最後Root依序`npm test --prefix sample`→`npm run build --prefix sample`；兩者不平行。真GUI驗Admin設定、Course預設→新Schedule、單堂與另一堂例外、Teacher唯讀、重開、手機中英文及未保存退出。

Always驗身份、來源版本及資料保存；Never猜業務、造學生名單／人數、讀或提交credentials、削弱舊測試。例行本機加表及API由既定完整系統開發＋獨立驗收自動繼續授權涵蓋；先前spec skill一般逐階段human approval不另取代本專案明確工作方式。AGENTS、main、新依賴、對外發送與部署仍依各自權限處理。
