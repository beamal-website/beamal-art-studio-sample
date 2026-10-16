# 指定學生／課次聯絡家長：來源及獨立驗收契約

2026-10-16。本片仍只Course／Timetable直接關聯，由指定學生課次打開家長聯絡。只讀repo／來源，在/tmp寫此報告；沒有修改repo、Git、原DB／既有服務或操作瀏覽器。本輪待製作者freeze後，才以自建/tmp新DB／loopback服務和actual fullsrc作獨立驗收，不先冒稱功能已完成。

## 來源及本片範圍

- 原PDF `/Users/yausiuhei/Downloads/Beamal web & app rough brainstorm remark (eileen.pdf` **p3**：同日已重新渲染並完整目視於 `/tmp/beamal-absent-source-page3.png`；學生行⋮手寫明列Send Message to Parent，與Make Up This Class並列。它要求正確學生／原課次入口，不代表可從姓名／電話推導家庭帳戶，也沒定義任意自動發送。
- 本地Notion `docs/schooltracs-rebuild/notion-requirements-source.md:119–124`：WhatsApp／App Notification兩渠道、Settings的Preset Message to Parents、填充／修改／Preview後發送。WhatsApp只能如實開對話／預填或顯電話讓老師聯絡；App由指定老師發出、正確學生／家長端接收，Notification Centre區分System與named sender。家長雙向回覆未定。
- 同檔`:104–106,112`與Goal `ULTIMATE-GOAL-PROMPT.md:258–260,274–275`：逐學生課次、Absent有家長訊息入口；App／Email本機測試渠道，不假稱已外送或已送達。沒有因此扣堂／釋位／改Full，也不自動結束Absent／Pending。
- 本地Notion是2026-10-14快照，不冒稱本輪讀到live Notion。前片已確證Chrome tab存在但官方stale-tab重綁後CDP focus仍逾時，且本片主要來源完整，**本次不再重試Chrome、不聲稱fresh SchoolTracs觀察**。既有官方Help Sending Messages to Students只能補充選定收件人→渠道／內容／範本的一般設計，並非本片權限或家庭策略來源。
- **模板真維護是後續必要slice。** 本片可先由老師輸入文字→Preview→本機App-test真記錄→inbox；不能把固定demo範本、Email templates或單次Compose當Preset Message to Parents已完成。也不順帶推進一般Messages／其他modules。

## 本輪明確設計選擇（不是PDF原句）

1. 只有Admin／**目前實際負責這堂**的Teacher可取得最小聯絡投影及準備訊息。其他Teacher的read grant不能自動升級成家長聯絡權；Student不能讀老師的聯絡editor來源。
2. WhatsApp資料只用同一canonical學生profile中明確記錄的`parentName`、`whatsApp`。缺欄顯未提供，不借student email／login email／contact1／contact2／phone／mobile補值；更不能按同姓／同電話找另一家庭。
3. App收件人只來自**此學生explicit student_account_links**指向的student-role登入帳戶。顯示名稱用明確帳戶／primary parent資料，缺姓名不得拿孩子名字假稱家長。App可用與WhatsApp電話是否已填是兩個獨立事實，不能因電話缺少就否認已驗證App link。
4. 訊息保存當時的recipientUserId及child/studentId。inbox必須同時滿足：`message.recipientUserId === current authenticated user.id` **且**目前仍有該孩子的`student_account_links(studentId,userId)`。不是只看現在誰接手孩子，也不是舊收件人只要仍連另一孩子便可讀全部舊訊息。
5. 老師／Admin的發件人由server真actor決定；Admin傳訊不能以當堂Leo／其他老師名義冒充。訊息分類是named sender／message，不能塞成System Notification或自動事件。
6. 本機App-test成功代表訊息已真記錄並由受權收件人inbox可讀；不是外部Push／電郵／WhatsApp送達。WhatsApp本片僅正確電話／預填內容；Preview／儲存／poll不自動開外站，不呼叫外部WhatsApp發送。
7. 不建家庭、不自動Convert／Paid、不變課次／出席／Pending／班額／扣額，也不將訊息成功當Absent跟進結案。只記錄經老師明確核對的內容，不自動夾帶內部Remark／Sticker／完整學生個資。

## 現有可重用事實與缺口（來源位置已實際讀）

- `sample/server/enrollment-orders.mjs:98–119`：管理員明確修改學生帳戶link，獨立版本；ownStudents／ownsStudent依studentId＋userId，不依電話或姓名。`:129,135–141,206–213`已有Paid exact student-session與current effective teacher/Admin核權，可參照其粒度，但家長聯絡DTO不得原樣洩露整份session remark。
- `sample/server/people.mjs:4–7,87–95`：primary、contact1/2與email均是不同既有欄；整份people profile目前Admin only。新Teacher聯絡投影應由已授權session取得白名單，不能開放全People或把contact2／地址／HKID等帶入。
- `sample/server/access-control.mjs:127`把student links／profile版本納入Student accessRevision；撤link後前端需清舊inbox／目前詳情，API仍須每次依DB重核，不能只信cache revision。
- `sample/client/student-portal-ui.js:18,32,70–74,87,97`有舊通知版型、System／Teacher分類及sample；shared data目前將notifications清[]。因此要明確接**真safe inbox來源**，不能借舊Chloe sample或把暫時error顯為No messages，也不能保留「虛構通知示例」稱已送訊息。
- `sample/client/lesson-workflow-ui.js:79–82`舊message view有channel/template/preview，但收件人可退回學生名、固定模板及preview complete；不能直接當本片真收件人／sender／本機outbox服務。
- `sample/client/interface-preview.js`的shared lesson resolver／opaque return ticket及Root `src.js` exact來源／身份／頁面返回機制可重用；不得讓舊公開openLesson('message', callerFacts)繞過新canonical來源。學生的sessionId、parentName、recipientId等form hidden值均不可自授權。
- SDK目前沒有真parent-contact／App inbox method；正式route／DTO／指令等freeze後以實際contract為準。本研究不另假設第二套API bodykey。

## 凍結前已定的結果導向獨立驗收

1. **Exact身份，不猜家庭。** 新fixture兩個同名學生、同一／相似WhatsApp但不同explicit帳戶；指定第二人第二堂。contact DTO只該人課、primary parentName／whatsApp；contact2／student email即使存在也不fallback。另一人／另一堂／原課改期的錯tuple不採。
2. **角色及current assignment。** Admin與目前Teacher可聯絡；read-only grant／前任Teacher／其他Teacher／Student／匿名拒。等待body後改授課者／撤link／降角色，再finalsend及舊receipt重試重新核權；不借先前GET授權永久可送。
3. **真App-test主路。** 自訂raw文字→Preview核對同一人課／recipient／真sender→本機記錄→只正確inbox見。body文字／context被安全escape，老師未選的內部remark／sticker／個資沒有自動外發；System與named sender分類不同。
4. **歷史不轉移。** 先送給A；孩子從A解除再連B：A不再讀該孩子訊息，B不能補收原寄A歷史。A仍有另一孩子link亦不能繞過；給B的新訊息只B可讀。相同帳戶有兩孩子時篩選／詳情仍按message childId，不把兄弟姊妹訊息混成一人。訊息具體收件人不隨當前link動態改寫。
5. **Preview過期與lost ACK。** 家長聯絡或App link在Preview後變更，不無聲重定向新收件人；要求重新讀／核對並保留草稿。真commit後ACK丟失／2xx壞JSON用原payload/key重試，只一筆message/audit/receipt；不能重發到新B。回放舊receipt若仍合法是原收件人的歷史結果，不拼成新對象成功。
6. **原子與資料保護。** audit或保存中途失敗整體回滾；並行／doubleclick／重試去重；restart持久。所有既有Paid／orders／student_sessions／出席／Pending／slots／holds／capacity／原profiles／links逐row不變，僅新message/audit/receipt及登入session可改。
7. **Host真路徑／返回。** 由名冊或exact課次進來源、原生radio／textarea／FormData→Preview→Back保raw值／同channel／recipient；Cancel／X／Escape回原學生原課、tab／scroll／stable焦點。點input不能被form data-action錯觸Preview；IME／focusout不誤send；背景unchanged poll不remount打斷輸入。忙碌／lateACK／換身份／導航不復活私內容或假success。
8. **Inbox安全／狀態。** 初次loading／error／ready empty分開、known消息分頁／總數正確。伪造messageId／childId／recipientId／重複query不能讀另一人；解除link後已開詳情清除，舊GET晚到不補回。無record／來源錯誤不能拿genericSystem替代。
9. **畫面證據。** Root真GUI中英390／768／1280，長文字／未知電話／缺App link／error／sent狀態／Teacher與family inbox／return；我另看其截圖但標screenshot-only。VM／controlledSDK不是本人真GUI。

## 仍未完成或未決（不阻擋本片已確認內容）

- Preset Message to Parents的真CRUD、保存／版本及模板填充仍後續主要slice，不列minor或已完成。
- 家長App雙向回覆、外部推送實送／送達／已讀追蹤、跨多guardian／優先收件、同意／通知偏好等未決，不在本片默設。
- Absent任務何時結案／更正出席重開、Pending完成條件沒有因本次訊息保存而決定；訊息成功不能自動完成工作。
- 若日後要「解除再重新連回原收件帳戶仍永遠不能讀舊訊息」，那是額外永久隔離／link世代政策。本片按Root明確的「原recipient＋目前同孩子link交集」驗收，不自行加入永久封存／轉移規則。

等待製作者／Root freeze後，獨立跑自己的/tmp HTTP／SDK／actual fullsrc案例；目前只交來源／契約，沒有產品GREEN聲明。
