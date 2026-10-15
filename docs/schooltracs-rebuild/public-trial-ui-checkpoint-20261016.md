# 公開課程 → 指定試課時段 → 資料與核對 UI

2026-10-16，test / f646793 後的有限 UI 工作。尚未接通試課提交、Applicant、配額佔用、付款或通知；完整 Course／Timetable、全 UI 與 Goal 持續進行。

## 來源與範圍

- 原稿 PDF p.1 保留學生中文／英文姓名、生日、學校、介紹人、WhatsApp、Email、課程與有興趣時段；Notion 相容延伸加入家長姓名。本輪 Research 重新目視 p.1／5／6，依據及未決必填政策整理於 `/tmp/beamal-public-trial-next-contract.md`。
- 必填／選填與完整電話格式仍待確認；本輪欄位可留空核對，不能把 3–18 歲示例變入學門檻，也不硬要求兩種姓名或家長姓名。性別及備註是可選 UI 延伸。Email 格式、有效且非未來生日及技術長度限制是基本資料修正提示。
- 正常舊入口原本已有 publicState adapter，可帶公開課程／時段快照；本次不是修正「所有入口必然假資料」。真正補上的是目前頁面／日期窗口／來源狀態／精確 Slot 的驗證、即時重核及獨立草稿生命週期；無選擇的 `/join` 及直接舊 shared launcher 不再落到虛構 Chloe／課程。
- SchoolTracs 本輪 Chrome 只讀重看 Channels → Manage → Preview／View Store：預覽商店沒有課程，無 token 的商店顯示未開放，因此無法動態對照 Course／Slot／Trial／Cancel。未保存、發布或新增外部資料，不能宣稱該條來源流程已驗通過。報告 `/tmp/beamal-public-trial-schooltracs-review.md`。

## 使用效果及資料邊界

1. 在已載入的公開課程選確切可用 Trial Slot，直接開空白個人資料表，摘要顯示同課程、日期、時間、時長及公開老師名稱，不再要求重新揀課。第二個不同老師／時長的 Slot 同樣帶正確資料。
2. 填寫 → 核對 → 修改保留原文、空字串、備註換行、輸入選取及原表單捲動；核對頁由頂部課堂摘要開始。取消／X／Escape 回同課程、日期／顯示日數與附近原入口；Slot 消失則回日期控制。
3. 錯誤電郵／生日會在該欄旁顯示修正提示，焦點與捲動帶到該格。這是實際畫面發現提示原在底部被 footer 遮住後的修正，先重現並寫 RED 再修正，不把舊錯誤截圖當成功。
4. 初次及核對前重新讀匿名公開來源；背景更新去重，不以原快照沿用已滿、已隱藏、已移時間或來源失效的 Slot。未知配額不造零；非法時間／零時長／跨午夜不開似乎有效表單。
5. 等待／失敗／時段不可用時保留草稿並停用核對，提供重新載入／取消。未變更來源的五秒背景讀取不重建原生輸入；中文組字中暫不重畫，完成後再套來源結果。離頁、Back、換身份或關閉後的遲到回覆不可復活表單。
6. 僅傳公開欄位白名單；不讀 People、Staff、私有 Slot 備註或登入者孩子資料。最後「提交申請」停用，偽造 submit／complete 亦無成功狀態或業務寫入。試課資料只在目前 UI 記憶，沒有宣稱保存申請。

## 回歸及獨立驗收

- Root 主流程先 1 pass／4 RED；Cancel 被 pending source 阻住的問題已修成立即關閉、背景刷新。草稿空白斷言修正為所有欄位空字串，而非錯誤要求 draft 必為空物件。
- 舊 shared launcher／IME 2 RED；unchanged poll 原生輸入重建 1 RED；非法時段 1 RED；修後原斷言保留通過。
- 獨立最終來源檢查 16／16：精確課程／窗口／Slot、真原生表單、錯誤與重試、中文 composition 事件、unchanged 不重畫、失效返回焦點、遲到回覆與 forged submit 均有測試。`/tmp/beamal-public-trial-independent-final-v3.log`。該 16 項在最後 inline-error／Review 捲動修正前；新增修正另有獨立覆核。
- 最後畫面發現的 inline-error／focus-scroll 2 RED，Review 初始位置 1 RED，修正後相關 12／12 通過。原無關測試沒有刪除／略過。
- 第一輪完整工作區 1329／1329、74.982654541 秒、build 3.20 秒；非法來源守衛後 1330／1330、69.664762458 秒、build 5.36 秒。以上是歷史版本；最後提示／捲動修正後完整結果另記，不沿用舊通過冒充。

## 真正畫面及資料核對

- 真 CUA 在既有隔離中心 `127.0.0.1:64048` 操作兩個確切 Slot：10-23 13:00 Leo／60 分鐘，10-24 16:15 Maya／45 分鐘。登入者為 Admin，但公開個人表仍全空，無 Chloe 私人資料；不是依賴登入角色補資料。
- 桌面填十欄，錯誤 Email／未來生日保原文；Enter 核對後 Edit 返回英文姓名游標 11–12、原 body 位置；Escape 回同 Slot 及 14 日原日期範圍。手機多行備註保留，Tab 從最後按鈕回 Close。
- 第二個 Admin 分頁經既有正式時段編輯將同 Slot default → hide，公開五秒更新已保草稿、提示不可用並停用 Next；還原 default 後同份草稿可再次核對。未修改正式課堂或 Trial 人數。這是隔離中心測試，不在原用戶資料庫發布時段。
- 隔離庫先備份。users／people／schedules／enrollment_orders／student_sessions／course_fees 六表逐列 hash 完全不變；仍 300 人物、2 已付款訂單、7 課節，沒有建立試課申請或佔位。`/tmp/beamal-public-trial-db-{before,after}.json`。
- 手機／平板／桌面截圖和最後提示修正的重驗結果另記。不同工具的 viewport override 會套到當時選取的分頁；已發現並排除曾錯標 768 的手機圖，不用檔名當尺寸證據。

## 本輪對原有 300 人示例再核對

原用戶 DB 只讀檢查：300 個指定學生 ID、中文名及英文全名各自唯一，152 女／148 男；有效生日、3–18 歲各年齡及全年十二月份均涵蓋。239 個 contact-based 家庭為 193 一孩／31 二孩／15 三孩，最多三孩，兄弟姊妹最短相差 491 日，姓氏、地址及兩位聯絡人一致。常見報名欄位全齊；四位指定成人老師與同一資源連結，三個 mock 登入對應原身份。沒有把聯絡人相同當成授權家庭帳戶。

原庫另有三個保留舊帳戶、一位停用舊老師及一位申請人，故不能冒稱整庫只有三帳戶／四資源／300 People；無擅刪。原人工修改仍保留。只有 Chloe 的兩筆 Paid 訂單／七課節，不把 300 active 名冊當成已完成 300 人報讀或付款歷史。檢查報告 `/tmp/beamal-realism-current-20261016.json`；原資料庫及 sidecar 前後內容不變。

## 仍須完成

Regular／Trial／Class Full／Trial Full 的完整公開組合與圖例、試課真提交及配額競爭／拒絕釋位、Applicant 手動 Convert、報名及跨角色連動，仍是主要工作。必填政策在依賴時再具體確認；本片沒有用「minor」延後核心功能，亦未標全 UI 或 Goal 完成。

## 最後修正後結果

- 完整工作區 **1333／1333，0 fail／skip／cancel／todo，82.930617458 秒**；隨後 build **2.63 秒、exit 0**。`/tmp/beamal-public-trial-final-v2-{test,build}.log`。既有大 chunk warning 保留，未稱全系統效能通過。
- 最後 inline-error／焦點／Review 位置由另一 Agent 指定重跑 **3／3** 並獨立 code review，無阻擋問題。`/tmp/beamal-public-trial-error-{targeted.log,review.md}`。獨立 DOM 模型不是實際讀屏驗收。
- 真 CUA 重載最後 bundle `main-B5_Fz6PL.js`：1280 電郵錯格取得焦點，提示 y580–604 位於 body y102–798 內；390 未來生日提示 y449–472 位於 body y90–742 內。修正後可核對，Review body scrollTop=0，Edit 回原 scrollTop=214／草稿；沒有再沿用被 footer 蓋住的歷史圖。
- 真正 768×900 中英文表單及英文長姓名核對，DOM innerWidth／documentWidth=768，JPEG 檔實際 768×900；390×844 innerWidth／documentWidth=390，1280×900 同樣無整頁橫溢。共十張已核尺寸的 JPEG 在 `evidence/public-trial-20261016/`。圖證與鍵盤／動態操作證據分開；unavailable 圖早於最後僅錯誤提示／Review 捲動修正，來源停用路徑沒有改動。
- 完成後取消回同 Maya Slot／from 10-16／14 日，公開畫面無私有備註；臨時兩個分頁關閉、viewport reset，原使用者分頁保留。公開表單分頁所捕獲的 error console 為空，未聲稱全環境沒有擴充功能錯誤。
- 最後十張 JPEG 由未製作此畫面的獨立 Agent 逐張檢視並核實檔案尺寸：三張平板均 768×900、錯誤提示已完整在捲動 body 中、長姓名／備註及三種寬度 header／footer 未見剩餘視覺阻擋。早前尺寸錯標及提示不可見兩項缺口已關閉；圖片不代替鍵盤、動態同步或無寫入證據。`/tmp/beamal-public-trial-visual-review.md`。
- 只含本次明列檔案的乾淨提交副本：npm ci 成功；完整 **1318／1318、0 fail／skip／cancel／todo、81.693958583 秒**，隨後 build **4.29 秒、exit 0**。`/tmp/beamal-public-trial-staged-{install,tests,build}.log`。與工作區 1333 差協作者未追蹤 Groups 模組的 15 項，未偷加其檔案。最後追加只有驗收文件，不改已驗程式。
