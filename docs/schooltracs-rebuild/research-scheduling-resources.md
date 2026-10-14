# SchoolTracs 老師／課室資源研究

更新：2026-10-14。本文記錄 root 在原系統直接操作合成資料的觀察，以及 Beamal 本機實作的不同證據。不是完整 Staff 業務、原系統所有權限或儲存規則已驗收的聲明。

原系統操作只涉及本輪建立的 QA 合成 Staff／Room；沒有邀請、啟用登入、發送訊息或使用真實員工／學生資料。本文整理只讀觀察和本機程式證據，沒有再次操作原系統。

## 1. Teacher 下拉選項與 Staff

| 操作順序 | 原系統直接觀察 | 可支持的結論 |
|---|---|---|
| 建立合成 Staff A，Role 最初為 Admin | A 沒有出現在 Add schedule 的 Teacher 選項 | 這次觀察中的 Staff 分類會影響該下拉選項；不能據此宣稱所有 Admin 均不能教課 |
| 把 A 的 Role 改為 Teacher，登入保持關閉，保存後回查 | A 出現在 Teacher 下拉選項 | Teacher 選項不要求這筆合成 Staff 已啟用登入 |
| 選取 A | 顯示帶移除按鈕的 chip；輸入位置仍可繼續選擇 | 一名老師可被選取及移除 |
| 建立合成 Staff B，Role 為 Teacher，沒有 email，也沒有邀請 | B 可供選取 | 這次流程不需要發出登入邀請 |
| 在同一 Add schedule 草稿選取 A 和 B | 同時有兩個 Teacher chips | **已驗證表單支援多位老師選取**，不能把 Teacher 實作為單一 ID |

這些觀察的 Staff Role 分類，不等於 Beamal 最終登入／權限模型。Notion R-01 已要求 **Admin／Manager 本身也可以授課**；Regular Teacher 的資料範圍另外受授權控制。Beamal 應把可授課老師資料與 login／auth role 分開，不能照這次下拉觀察把 Admin 禁止授課，也不能新增資源就建立登入帳戶或授權。

最初看到 `No options`，只是當時選項池為空的畫面；後續新增／分類合成 Staff 後選項出現，**不能把 No options 當成系統沒有老師功能的證據**。

## 2. Rooms 設定與多選

root 在 Settings → Rooms → Create 直接看到以下欄位：

| 欄位 | 已看到的表單形態／操作 | 未驗證部分 |
|---|---|---|
| Name * | 必填名稱 | 長度、同名或改名處理未實測 |
| Capacity | 可留空的數字輸入欄位 | 0／負數／小數政策、預約上限與自動計算未實測 |
| Detail | 文字欄位 | 原系統長度上限未實測 |
| Remark | 文字欄位 | 原系統長度上限未實測 |
| External location | checkbox，欄位說明涉及 Online Store 地址顯示 | 未實測切換後的公開地址效果或地址業務規則 |

本輪建立合成 Room A（Capacity 6）與 Room B（Capacity 4），然後在同一 Add schedule 草稿同時選取兩個 Room chips。**Room 多選表單已直接驗證**。

選取 A＋B 後，排課表單的 **Capacity 仍然空白**。這只證明該次草稿沒有立即把 6、4 或其總和填進排課 Capacity；不能據此推斷保存後的預設、預約名額限制、課室容量相加規則或超額政策。

## 3. 三張畫面證據與限制

1. [Teacher A 已選取](evidence/schooltracs-resource-teacher-selected.png)：Add schedule 顯示一個可移除的 Teacher chip。
2. [同時選取兩位 Teacher](evidence/schooltracs-resource-two-teachers.png)：Teacher 欄位同時有兩個 chips，輸入位置仍在。
3. [同時選取兩個 Room](evidence/schooltracs-resource-two-rooms.png)：Room 欄位同時有兩個 chips，下方排課 Capacity 空白。

圖片已逐張讀取核對。chip 名稱在圖片被截短；A／B 的建立、角色修改與回查順序來自 root 的直接操作紀錄，這三張圖本身不是整段 Staff 操作錄影。

**兩種多選排課草稿都沒有按 Add／Save。** 因此來源只證實選取 UI，不證明兩位老師／兩個課室已成功保存到排課、重開可讀回、日曆分組或篩選效果。Room 設定記錄的建立與排課保存是兩件不同的事。

## 4. 尚待原系統證實

- 保存多位老師／多個課室後是否完整回讀，及更換／移除的保存效果。
- 同時有多位老師時的主要顏色、老師分組、統計及篩選處理。
- Room Capacity 是否在保存、預約或其他流程才參與計算；沒有觀察到的規則不可補成「自動相加」或「硬性上限」。
- Staff／Room 的同名、改名、停用、刪除與歷史排課行為。
- 原系統 ID、版本、重試、併發衝突與後端授權機制。
- Teacher 可選範圍與各種 auth role 的完整關係；單一 Staff A 的分類結果不等於最終 Beamal 角色規則。

## 5. Beamal 本機選擇：不是來源已驗證的規則

| 本機規則 | 本機用途／效果 | 證據界線 |
|---|---|---|
| 正式資源使用穩定 ID，排課保存 teacherIds[]／roomIds[] | 改名不靠文字重新配對，支援多選 | ID 形態與本機關聯是 Beamal 設計，沒有證明原系統使用同樣 UUID／schema |
| 資源與 users 分開 | 新增老師不建立 login／invite；Admin 可有授課身份 | 與 Notion 方向一致，不能把原系統 Role 下拉直接當成 auth policy |
| version＋交易＋重試 receipt | 防舊資料覆蓋及重試重複保存 | Beamal 保護規則；原系統未測相同機制 |
| 同 kind 名稱經 trim／大小寫處理後重複回409 | 引導重用或改名，包含停用記錄 | **暫定同名保護**，來源未測同名是否允許 |
| active=false 保留 ID／歷史指派 | 舊指派可保留或改時間，新指派／新建／複製不能新增停用資源 | **暫定停用保護**，來源停用未測 |
| 舊 teacher／room 文字只容許 current unchanged | 不按同名把 demo 或舊文字自動配真人；更換須選正式 ID | Beamal 相容舊資料規則，不是來源已測的 migration |
| 明確 [] 清除指派 | 清除對應文字快照；缺省與空陣列意義不同 | Beamal API 契約 |
| Room 基本欄位保存 capacity／detail／remark／externalLocation | 保留已看到的主要資料；Capacity 不自動套入排課 | 本機 null／正整數、2000 字及 boolean 校驗是防錯設計，來源上限未測 |

上述本機規則不改課程／費用身份，也不建立登入憑證。其他 Notion 人員／細項授權仍屬獨立完成條件；現在 teacher 可讀全校資料的落差記在 [本機系統架構](local-system-architecture.md)，不能因資源 CRUD 通過就視為正式權限已完成。

## 6. 本機 backend 限定核對與回歸證據

此段是實作者在完成後的限定唯讀自查，以及收到獨立 reviewer 指出問題後的修補證據；不代替另一位 reviewer 或全系統驗收。行號以本文件日期的工作樹為準：

| 核對項目 | 具體程式位置與效果 |
|---|---|
| 非陣列、重複或不合法 ID 值 | `schedules.mjs:34–36` 拒絕不合法 teacherIds／roomIds，不默默丟字段 |
| 不存在／種類錯誤／停用新指派 | `schedules.mjs:108–119` 查正式資源；種類錯誤400，新停用指派409；已在該堂的停用 ID 可保留 |
| 缺省、舊文字及權威快照 | `schedules.mjs:122–134` 保留已存在 IDs，不按同名配對；只有真正換成員才取資源名稱生成快照 |
| 新建／whole edit／restore | `schedules.mjs:158`、`:170`、`:180` 在同一交易核對資源、課程與現有版本；restore 保留原指派 |
| 單堂與 following 範圍 | `schedules.mjs:227–268` 只把實際修改欄位套到所選及往後；單堂用該堂原指派核對，後續不同指派不因只改時間而覆寫 |
| 新增 slot 不能帶入停用資源 | `schedules.mjs:136–149` 比較受影響 segment／exception 邊界和新 slot，不展開無限課次 |
| shared helper 深拷貝 | `schedule-occurrences.js:13`、`:78` 複製 ID 陣列，投影／編輯草稿不會修改原記錄 |

### 同成員重排的已修問題

獨立 reviewer 指出：資源改名後，選單順序可改變，客戶端送回相同成員但不同順序；若把陣列順序當成更換指派，time-only following 會清掉後面某堂的不同老師／課室例外。

已以真 HTTP 先重現 RED：系列原為 A＋B 老師／課室，第3堂另有 C 老師／C 課室；rename 後逆序送回 B＋A 並只改時間，錯誤把第3堂覆成 B＋A。修補後 `schedules.mjs:9–15` 按**成員集合相等**比較，`:126–132` 在同集合時保留開啟時順序及名稱快照。新建仍保留輸入順序，真正改成員仍按所選範圍生效。

[schedule-resource-assignments.test.mjs](../../sample/server/tests/schedule-resource-assignments.test.mjs) 的實際 HTTP 回歸涵蓋上述 rename／重排／後堂 C 例外，亦檢查有效多選、錯誤／停用資源、legacy unchanged、清除、單堂／following、取消還原及課程費用不變。[scoped-schedules.test.mjs](../../sample/server/tests/scoped-schedules.test.mjs) 保留改期、following 規則、Undo、版本、重試與真 audit rollback 的原有驗證。

修補後定向兩檔合計 **14/14 GREEN**。這是本機 backend 的範圍證據，不代表原系統多選排課已 Save，不代表前端／手機版、完整 Notion 或本機300學生驗收已完成。完整 test／build／瀏覽器驗收仍由 root 整合執行。
