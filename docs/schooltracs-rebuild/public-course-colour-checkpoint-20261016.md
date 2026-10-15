# 公開課程顏色設定與同源顯示 — 2026-10-16

## 原稿與本片範圍

對應原稿 p.4 公開 Regular Class／Available Timeslot 的課程色彩文字圖例，以及 Goal §8.2、PDF-GAP-13。原稿 p.2 老師代表色與 Full 標記各有不同含義。本片建立由 Course 擁有、可由 Admin 維護的公開顏色；不以教師色、Regular／Special 課型規則或名額狀態代替。

六個現有課程未有已確認的 Pre／BB／A／Interview 對應，不自動配色或猜配原稿分類。以實際 Course ID 及完整名稱識別；未設定仍正常顯示課程名稱與時段。當前單課程頁及課程目錄具備文字與色票，**原稿混合多課程每週格表仍未完成**，不能用本片取代它。顏色屬當前公開展示設定，不是歷史報名資格或 ClassType 快照。

## 可操作流程

- 課程 → 指定課程 → 修改：公開課程顏色可啟用、用原生色彩輸入選取或清除。未設定時明示「未設定」，picker 同時 hidden／disabled，避免把其技術預設色誤當已保存資料。取消勾選後按儲存才清除；Cancel／X／Escape 不保存。
- 新增課程與修改共用欄位及輸入處理。未觸碰的舊呼叫保值；明確清除為 null。介面專用的 checkbox／marker 不送入服務。
- 匿名課程目錄及單課程詳情、Admin 真公開預覽共用同一個 Course 公開投影。課名旁色票及時段上緣為課程顏色，名稱仍採原主題文字色，白色有外框；Available／Full／待確認標記獨立。
- 顏色修改不改價、老師、課型、班額、排課、Trial／Rescheduling quota、hold、報名資格或公開門檻。公開更新不蓋走正在填的 Trial 草稿，不因此重畫原生表單。
- 真 GUI 發現原 Course metadata 儲存後焦點落 body；先新增斷開舊按鈕、尋找同 ID 新按鈕的失敗測試，再在成功 render 後接回既有 context-aware 焦點／捲動恢復。身份、頁面、月份等守衛未放寬。

## 資料與 API

既有 Course JSON metadata 新增 optional `publicColor: null | '#rrggbb'`，沒有另建顏色對照表或重設資料庫。寫入只收六位 hex，正規化小寫；不接受任意 CSS、URL、換行、短碼、物件或其他型別。省略 PATCH 保值、null 明確清除。舊資料缺失／格式非法時，DTO 為 null，不在讀取或啟動時修寫原 JSON。

沿用既有 POST／PATCH Course 權限、CSRF／Origin、版本衝突、交易與 audit；metadata-only 保持 `updatePricing=false`。公開 Course DTO 只在 id／courseName／category／level 外加經重驗的 publicColor。可見顏色參與公開 revision；隱藏課程、私人備註及老師代表色不洩漏到公開內容／revision。直接 forged Teacher／Student／anonymous 寫入被服務拒絕。

## 證據與驗收界線

- 新 frontend 六案例先 **5 fail／1 pass → 6／6**；實際焦點問題另有 **0／1 RED → GREEN**，最後七條此片正式 frontend 測試全過。後端新增六測試先 **0／6 → 6／6**，相關七 server 檔 **76／76**；覆蓋格式、保存／省略／清除、角色／Origin／CSRF／CAS、重啟、舊 JSON、不公開來源、revision、業務表不變及 audit 失敗整筆回復。
- 獨立前端 **17／17**、五軸 review 通過，包含取消／衝突原生草稿、舊 caller、Create 欄位、late identity／舊 ACK、Trial 草稿零 remount、管理預覽、同 ID 焦點及捲動、晚到回覆不跳回另一課程。另位 Research／reviewer 對 backend source 及六組純資料邊界覆核通過；沒有冒稱它重跑真 HTTP／DB。
- Root 最後工作區完整 `npm test --prefix sample` **1375／1375**、115.317 秒，無失敗／取消／跳過；隨後 build **3.76 秒**成功。前一輪 1374／build 2.34 秒是焦點修正前，沒有當作最終證據。build 仍有既有大型 bundle 提示，這不是效能／300 並發驗收。
- 乾淨 index 副本 `npm ci` 成功；完整 **1360／1360**、57.238 秒，隨後 build **2.28 秒**成功。差 15 條是工作區另外未追蹤的 Staff group 測試，不混入本提交。所有 staging 的 sample 來源／測試逐 bytes 與乾淨候選一致；獨立前端 manifest 亦核對。
- Root 真 GUI：1280 中文未設定／保存紫色及匿名同色、390 中英及 768 英文表單、手機取消清除後仍為白色、按 Save 才 null、重新開啟仍 Not set／picker hidden+disabled。管理預覽 390 同色、日期 10-23／14 日／Class；Escape 回原公開入口。Tab 從最後 Save 回 Close、Escape 回 Edit；英文手機 body 捲至最底，footer 在視窗內，無整頁橫向溢出。最新修正後真 Save 焦點確實回 Edit。
- 真訪客草稿填 `Iris Lee` 及備註，Admin 改／清顏色後原生資料仍在、同一課堂、無來源錯誤；Cancel 返回原 Class／日期／14 日。這是 UI 草稿，不是實際 Applicant、預約或付款。
- 色彩控制用瀏覽器原生 input 並以 UI 填值及勾選驗收；未驗 OS 系統色盤／滴管的所有操作。獨立代理本片未操作真瀏覽器，17 條是 host／DOM 模型；Root GUI 與獨立程式驗收分開，不稱全面獨立 GUI 已通過。
- 本片沒有新 SchoolTracs／Notion 線上觀察；沿用前片重新目視的原 PDF p.4、2026-10-14 Notion 快照及已記來源限制。顏色維護契約是 Beamal 的相容設計，非冒稱 SchoolTracs 已有同一設定。

## 實際資料保護

原 `sample/.data/beamal.sqlite` 更新服務前備份，服務重開前後 **42 張表逐列不變**，健康檢查正常；沒有為六課程配色或修改任何使用者資料。

所有實際色彩保存都在隔離 GUI 資料庫，同一指定課程共五次 ACK：紫色→白色→清除→紫色→清除；Cancel 沒有寫入。最後只 `courses`／`audit_log` 變動，**40 張表相同**，其他課程逐列相同，該課程除 publicColor／version／updated_at 外不變。正式時段、價格、人物、訂單、權限、hold 及 Class Available／Trial 2 保留；最後顏色為 null，正常修改歷史保留。私人資料庫與備份不入 Git。

瀏覽器尺寸及語言已還原，關閉自開的 31／32 隔離分頁，保留用戶原 localhost 分頁。原網站仍由原資料服務運行；只更新程式不重設帳戶。

## 畫面

`evidence/course-colour-20261016/`：01 未設定 1280 中文；02 匿名紫色與獨立名額 1280；03 中文手機已選色；04 中文手機管理預覽；05 英文 768；06 英文 390；07 英文手機捲到底／footer；08 清除後重新打開的未設定狀態。03、04、05–08 使用實際 viewport clip，沒有拿縮圖當完整 390／768 畫面；所有圖來自隔離測試，選色後已清除。

## 下一步與未完成

原稿多課程公開週表、完整公開報名／Submit／Reject／Convert、業務資格及配額政策、全 UI 和 27 項最終情境仍在 Goal。Create 成功後的焦點返回另有同類缺口，下一片處理，未當作 minor 或已驗通過。當前只完成課程公開顏色維護與現有頁面展示，不宣稱整個 Course／Timetable 或 Goal 完成。
