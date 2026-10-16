# 個別學生課次待安排：2026-10-16 檢查點

本片只處理時間表／課程直接相關的 Pending Confirmation 保存與續辦；其他模組仍擱置。整套時間表、課程及 Goal 尚未完成，本文件不更改原 Goal 或 AGENTS.md。

## 使用結果

Timetable → 指定課次 → 指定學生 → **Make Up This Class** → Pending Confirmation → 核對 → Save，現在會真正保存。只標記該學生該堂，沒有選定新時間、不預留目標名額、不釋放原位、不改出席、付款、課節數量或其他學生。

負責老師及 Admin 的首頁／To-do 能讀到同一紀錄，與試課跟進分成兩組，數量各自準確；Pending 組先顯示。由待辦可直接回到正確學生／課次，不要求先到某月／某週找班；取消返回原待辦、捲動及按鈕焦點。已 Pending 可繼續查看時段，沒有重複保存按鈕或假完成操作。

學生的已報讀課表只顯示自己課次的安全「待安排」狀態，不取得老師內部歷史、其他學生或申請人資料。既有課次仍在原日子及時間，這不是已完成調課。

## 保存、權限與失敗處理

- 獨立資料以既有 StudentSession ID 綁定，單一紀錄投影唯一待辦；出席與 Pending 的版本分開。讀取確認沒有 Pending 才為 version 0，未知資料不造 0。
- 保存核對 Pending、學生課次、正式排課三個版本。重複／並行操作不建兩條待辦；正確已存狀態可安全不重複寫入；舊版本衝突要求重新核對。
- Admin 或目前實際負責老師可寫。Course／Room 的查看授權不會變成修改權。HTTP 讀完正文後、回放舊回條前亦重新檢查當前權限。
- 取消／刪除原課等不會刪 Pending 歷史。可解析當前責任時顯示唯讀不可安排；無法解析老師權限時不向老師回傳私有紀錄，Admin 保留歷史。
- 只接受精確人物、課次、來源及版本的真實 ACK。已保存但回覆遺失可用同操作識別重試；來源讀取失敗也不會讓成功回條永遠卡在未確認。沒有完整名單時不憑回條捏造出席資料。
- 保存前開始的舊待辦讀取會失效，不能晚到覆蓋為「沒有待辦」。等待新來源時顯示載入，不自行猜數量。

## 同版驗收與實際畫面

最後 `npm test --prefix sample`：**1771／1771，0 fail／skip，73.80 秒**。`npm run build --prefix sample`：**通過，9.73 秒**；既有大檔案體積警告仍存在。獨立 HTTP／實際 SDK **7／7**、完整實際 src＋controller／resolver **10／10**，共 **17／17**；模型不是瀏覽器，與下列 GUI 證據分開。

上述是本次工作區全套數量，包含原已存在而未提交的 15 個 staff-roster-groups 測試；該不相關檔案及其他未提交工作沒有混入本片提交，獨立 checkout 的總測試數量會不同。程式沒有依賴該未提交模組。

獨立驗收保留兩個真失敗及原斷言複驗：失去 ACK 後名單讀取失敗會擋掉成功重試；舊空待辦回覆可晚到覆蓋新任務。兩者均已修正，正式回歸測試同步保留。另覆蓋精確同名／另一堂、並行、稽核失敗完整回復、重啟、流式正文期間撤權、非空 Trial／調課預留與 Full 不變、取消歷史、原生表單偽造欄位與待辦取消後全域登出。

GUI 使用既有獨立測試庫，沒有重設原資料：Admin 對 Chloe 的創意繪畫 2026-10-16 13:00 及水彩探索 2026-10-17 10:00 分別保存；首次核對後取消時資料庫仍為零 Pending。保存後兩條獨立 Pending，Leo 首頁顯示 2 Pending＋1 既有 Trial＝3；由創意課待辦續辦不會誤開水彩課。手機取消續辦回到同一課次的按鈕焦點。

390×844 英文核對／真保存結果、390 中文續辦／老師首頁、768×1024 中文學生月曆已目視；學生只有上述兩堂標「待安排」，其餘四堂無標記。重啟同一服務／資料庫後，新分頁的真 Teacher 登入仍看到同兩條 Pending 與一條 Trial；桌面實際尺寸 1280×720，整頁寬度無溢出。獨立截圖審查與 Root 的動態 GUI 分開記錄。

IAB 曾在改尺寸後出現過時縮小截圖及輸入命令延遲；固定尺寸重新載入／新分頁後再拍。只收錄正常尺寸圖片。沒有用呼叫私有函式或直接改瀏覽器資料冒充 GUI；獨立實際程式模型亦驗過續辦取消後可正常登出。

## 原資料保存

原使用者資料庫：原 47 表逐行不變；只新增一個空的 Pending 表，完整性 ok。

GUI 測試庫：新增 Pending 2、對應稽核 2、操作回條 2；登入 session 有預期變動。其餘 44 個原表內容逐行不變，包括學生課次／出席、課程、排課、付款、正式／Trial 名額、申請人、老師及帳戶關聯。沒有重產生 300 位人物或增加新的正式學生。

## 來源與尚未完成

來源是 Notion 本機需求快照 §6.3／EX-07 與 Ultimate Goal §8.5–8.6；[實作來源地圖](evidence/pending-arrangements-20261016/source-map.md) 分清已確認效果與技術選擇。這是 Beamal 延伸流程，沒有新 SchoolTracs 動態操作證據，不宣稱其參考系統有同一功能。

尚未接通目標時段資格及最終調課確認、原／目標名額結算、同課題識別／週期及日期約束、扣堂、Pending 完成結案／逆向、家長調課／病假請求、Absent 自動跟進、持久化個別老師優先排序、完整課包額度等。它們仍是必要課務，並非 minor；未確認規則沒有自行決定。Trial 最低必填規則仍待既有問題答覆，正式新申請 gate 保持關閉。

## 證據

- [完整測試](evidence/pending-arrangements-20261016/full-test.log)、[建置](evidence/pending-arrangements-20261016/build.log)
- [獨立驗收](evidence/pending-arrangements-20261016/independent-review.md)、[HTTP／SDK](evidence/pending-arrangements-20261016/independent-http.log)、[實際 src](evidence/pending-arrangements-20261016/independent-host.log)
- [原資料](evidence/pending-arrangements-20261016/original-data-check.json)、[隔離資料](evidence/pending-arrangements-20261016/isolated-data-check.json)
- [手機保存結果](evidence/pending-arrangements-20261016/pending-saved-390-en.png)、[中文續辦](evidence/pending-arrangements-20261016/pending-resume-390-zh.png)、[學生月曆](evidence/pending-arrangements-20261016/student-calendar-768-zh.png)、[老師重啟後](evidence/pending-arrangements-20261016/teacher-after-restart-desktop-zh.png)
