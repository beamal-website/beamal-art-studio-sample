# 公開多課程每週課表 — 2026-10-16

本片延續原稿 PDF p.4 的每週公開時段、完整課名、課程色彩及 Full 資訊，以及相容 Notion 的 7–30 日日期範圍與 Trial 篩選。這是 Goal 階段 A 的公開入口及管理工作切片，不是整個系統、實際試課提交或規模驗收完成。

## 結果及來源界限

- `/schedule` 現在是真正多課程課表；`/classes` 保留課程目錄，另有「查看完整課表」入口，單課程頁保留既有功能。
- 7–30 日每七日分組，14 日兩組、30 日五組，最後短組保留每個真實日期。桌面每排七日、平板兩欄、手機逐日；同時間不同課程及同名課程都保留各自 Slot／Course ID，不按時間或名字合併。
- 每格顯示完整課名、課程色彩、日期、時間、時長及公開老師／課室名稱；課堂、試課、調課的名額狀態沿用現有獨立語意。白色／未設定顏色仍有文字及邊框，沒有改用內部老師色。
- 新 anonymous `GET /api/public/timetable` 以同一讀取交易及一份正式 facts 產生資料，不為每課程重讀，也不自動發佈所有內部排課。資料只讀，沒有新增公開寫入或放寬角色權限。
- 課程篩選選項故意包含全目錄已公開課程，包含本日期範圍外課程；圖例只列當前實際顯示的課程。窗外課程名字／顏色變更會改公開 revision，因為它仍是可見選項。這是製作與獨立驗收明確採用的契約，與最初 research 建議 range-only courses 不同。
- Research 上一 Goal 切片已實際從 Chrome SchoolTracs Channels → Online Store → Preview 查看，只顯示 Courses／No courses yet；因此沒有聲稱觀察到該站同時間多課程或此週表版面的完整行為。每週分組方向依原 PDF；樣式沿用 Beamal。沒有修改 SchoolTracs 設定或內容，沒有取得新的 Notion 版本。

## 連接及返回

- 家長可直接選指定 Slot 開試課資料表；用確切 Course ID 重新讀取其公開資料核對，錯配、已隱藏、移日、資料異常及身份變更不借用第一課程。未提交前的草稿不因顏色背景更新被洗掉；取消回同一時段及位置。
- 課程詳情與明確返回／瀏覽器 Back 保留原範圍、課程／類型篩選、捲動及精確入口焦點。記錄「訪客有無覆寫預設」與當時實際日數；子頁使用當時實際範圍，中心預設中途改變也不縮走第二週或擴成另一窗口。
- Admin 在內部 Timetable「可約時段」工具列可預覽整體公開課表；單課程原有預覽保留。兩者共用公開資料及 renderer；只有明確點「管理時段」才讀私人資料。
- Admin 指定時段 → 私人資料 → 修改對應正式課次 → 取消 → 私人資料 → 公開預覽，保留真實課程／固定課次／日期及原位置。編輯開始前及等待課型載入後，均核對公開快照、私人 Slot 及最新正式課次的 Course／日期／時間／時長；途中來源改變就刷新，不開錯堂。
- 各日期窗口各有快取及 conditional revision；Reload、身份更換及遲到回覆不能覆蓋新範圍、重開舊彈窗或洩漏私人資料。選定課程被撤下後顯示「所選課程暫未提供」，不暗示已轉成「所有課程」。

## 驗證

- Root 原生 host／SDK 新測試先 RED，再 GREEN；另兩個回歸先證明正式來源 Course／時間／時長漂移、預設窗口改變的缺口，再修正。舊 linked-source 測試原 fixture 的 Slot 13:00／60 與其 schedule 12:30／45 不一致，已修正 fixture 為真正一致來源；沒有放寬新 guard。
- Maker 純 renderer 13／13、後端 6／6；獨立原創測試 26 組（backend 3、host 16、pure 7）及 maker backend 另重跑 6 組通過。另一位獨立 reviewer 原先找到兩個 source drift 缺口，修正後共 8 組通過，包括異步準備期間改課。見 [獨立驗收](evidence/public-week-20261016/independent-review.md)。這些是 source／VM／HTTP fixture 證據，不冒稱獨立 live GUI。
- Root 真正 IAB：390 中文公開頁／試課表、768 英文公開頁、1280 中文公開頁及英文 Admin 預覽；實際 DOM width 與 scrollWidth 分別相同，14 日期／兩組。手機 Admin dialog 374px、body client／scrollWidth 均 372px，頁寬 390px。
- 實際同日 13:00 顯示「創意繪畫」與「水彩探索」；第二週 10-30 水彩 → 詳情 → 返回，原日期10-23、14天、課程與試課篩選、焦點及捲動恢復。直接 Trial 正確帶入 10-30 13:00，輸入中文姓名及家長後 Escape 保留來源位置；沒有正式送出申請。
- 實際 Admin 全局預覽 → 水彩 10-24 10:00／60 → Edit linked lesson：正確鎖定水彩、該日及第二課次；取消逐層返回同一 Slot。此片 GUI 沒有按正式排課 Save，不能把取消路徑當成功保存證據。
- 畫面：[桌面](evidence/public-week-20261016/public-1280-zh.jpg)、[手機](evidence/public-week-20261016/public-390-zh.jpg)、[平板英文](evidence/public-week-20261016/public-768-en.jpg)、[手機試課](evidence/public-week-20261016/trial-390-zh.jpg)、[管理預覽](evidence/public-week-20261016/admin-1280-en-top.jpg)、[手機管理](evidence/public-week-20261016/admin-390-en.jpg)。原始尺寸保留，不用縮圖代替實際 CSS viewport。
- 全套／build、乾淨提交候選及最後資料保護結果見下方完成紀錄；完成前不以此段當作全套已過。

## 資料與剩餘工作

原用戶資料庫沒有為驗版面自動發佈或新增排課；42 張表逐列快照保護。兩課程、同時段、第二週 fixtures 只在既有隔離 GUI DB，以授權 mock Admin 經正式 API 建立；原本內部備註沒有出現在 anonymous 投影。完成後三個新增時段均經正式 API 停用、兩課程顏色回復，保留正常修改／去重歷史；36 張非相關表逐列不變、所有原有 Slot 逐列相同。原用戶 42 張表仍逐列完全不變。照片／學生聯絡資料不加入本片。

Trial Submit、試課名額佔用與 Reject、Applicant Convert 及通知尚未接通；最後送出仍清楚停用。Regular／Trial 預設發佈組合、Full 資格及三配額合算等未決政策沒有被此畫面代決。Create 成功儲存後焦點的既有待辦、其他全系統 UI、核心寫入及 27 個最終情境仍須完成。300 名冊不等於 300 已報讀／付款學生；不縮小整體 Goal。

## 完成紀錄

Root 最終完整工作目錄測試 **1401／1401**，64.782 秒，無 skip／取消／失敗；build 初次 6.01 秒通過，最後只改移除重複標題的 CSS 後 build **3.36 秒**成功。Vite 提示既有 main bundle 超過 500kB，未冒稱本片解決整體程式碼大小或規模效能。乾淨提交候選重新 `npm ci` 後，**1386／1386** 測試、64.863 秒及 build **2.56 秒**通過，無 skip／取消／失敗；比工作目錄少 15 項是沒有把其他人未追蹤的 staff-roster-groups 測試混入本片，不是停用測試。所有六張正式截圖 hash 與獨立審查清單一致。

隔離 GUI 只新增三個可約 Slot、暫設兩課程色彩及正常登入，完成後停用新 Slot、還原色彩，保留 audit、idempotency 及 session 記錄。保護檢查為 36 張其他表逐列相同，原 Slot 逐列不變、六課程業務內容不變（兩筆只多已還原 null 色彩欄位／版本）。沒有改學生、老師、權限、費用、訂單、正式排課或預約。原用戶服務已原路重新啟動，5173 代理讀新公開 API 為 200；原 DB 42 張表仍逐列不變。

最終六張截圖另由獨立 reviewer 重開實際檔案審查，已拒絕／重擷取最初背景及縮圖截圖，不將它們當通過證據；見 [視覺審查](evidence/public-week-20261016/visual-review.md)。

本片提交目標為 `test`；提交內容不包含 AGENTS.md、GOAL.md、其他未追蹤工作或任何資料庫。提交編號由本檔所在 Commit 及對使用者回覆記錄，不在提交前虛構。沒有 push 到 GitHub；後續仍以整個 Goal 為目標，不把本片當作完整交付。
