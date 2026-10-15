# 公開課表：管理預覽與正式來源返回 UI 檢查點

2026-10-15，香港時間；基準 test / 9092f2b 後的 UI-V2-07 限定子片。完整公開課表、全 Course／Timetable、全 UI 及整個 Goal 仍未完成。

## 任務及來源

Admin 在課程的可約時段區按「公開課表」，看同一公開資料服務的七日結果；選該時段進正式資料，再修改其正式來源，取消逐層返回同一時段、預覽日期及課程位置。Standalone 修改現有 Slot；Linked 另按「修改正式課堂」定位固定 schedule ID／sequence／實際日期。公開及正式資料不另造副本。

- 原稿 p.4、PDF-GAP-01／09、現行 Goal §2.2／8.2：保留人工維護與預覽，正式時段同步用來減少重填，不能只剩顯示／隱藏。以已核實原稿對照為依據，本片沒有宣稱重新目視九頁或重讀最新線上 Notion。
- Research /root/course_ui_map_v2 本輪只讀程式及 Chrome SchoolTracs：可讀 Channels → store-settings 入口，語意 click／已觀察 AX click 分別遭 Runtime.evaluate／Input.dispatchMouseEvent 逾時；最後仍是原 Sales 空清單。沒有保存、付款或更改外部資料。**不能聲稱本次已實測 SchoolTracs 公開預覽全流程**；Beamal 按原稿及已確認 UX 要求完成本片。報告 /tmp/beamal-public-timetable-next-review.md。
- 本輪查閱 [W3C APG Modal Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) 的視窗內焦點及回原入口原則，實際採用逐層返回、Tab、Escape 與焦點還原；並非全站無障礙認證。

## 實作及界線

- 新入口只在 Admin 的指定 Course 顯示；普通老師、學生及匿名沒有公開管理入口，偽造管理 action 亦不派發私人時段讀取。
- 預覽呼叫既有匿名 publicCourseDetails，沿用同一公開 renderer。管理 DTO 的 remark、excludedStudentIds、學生及內部老師資源 ID 不交給公開畫面，沒有用名冊湊公開結果。
- 七日範圍、日期、課程 ID、Slot ID 重複／缺失、跨課程／跨日期與第一次 unchanged 回覆均核對。讀取、未公開、空七日、錯誤與重試分清，不以私有資料回填公開結果。
- 管理入口只認目前合法公開範圍內的確切 Slot；讀正式詳情後再核對 course／date／time／duration／active／sourceAvailable。來源變更時回預覽重新讀取，避免編輯另一個時段。
- Linked 修改只走同一排課服務的正式指定課次；原資料已移日／刪除／取消或身份失效，不重新打開舊表單。容量及公開配置仍走原 Slot editor，沒有重造可獨立修改的複製時間。
- 編輯取消 → 同正式詳情 → 原預覽；最後關閉預覽回原 Course 月份、展開群組、表格／頁面位置與入口焦點。真正保存收到 ACK 後重新讀公開投影，不用私人 ACK 直接冒充公開結果。
- 離頁、Browser Back、月份或身份／資料權限改變，以及遲到的公開、正式詳情、資源準備回覆均失效。背景 Course 月份控制在 modal 期間保持不能操作；測試真正改月時先斷言月份確實已變，沒有把被正確擋住的背景點擊當作已導航。
- 中文組字時 Escape 不丟失 Slot 原生草稿；範圍錯誤隱藏管理入口，偽造點擊亦受攔截。
- 最後 GUI 發現清空日期後回填舊日期卻仍顯錯誤，已先 RED 再修正：dateInput 只保管理員未完成輸入、canonical from 仍是最後合法查詢，空欄保留待修；重新整理清草稿並重新讀最後合法日期。dateError 保已核實公開課名作辨識，隱藏全部 Slot；loading/error 不顯過時課程。匿名不採用管理草稿。
- 沒有新增保存 API、改配額合算／Full／公開預設政策、開放試課提交、外部發布、真寄件或圖片替換。

## 驗收

- 製作 Agent UI 模組先4 RED，後26通過；日期修正另先3 RED，最後28/28。主 Agent host 最後12/12，含完整來源／取消、權限／偽造、資料邊界、遲到、pending resource、IME、ACK 公開重讀及空日期恢復。沒有刪除／跳過既有測試。
- 獨立 /root/staff_leave_host_map 17/17：同版主10＋額外6＋空日期1；/tmp/beamal-availability-preview-final-date-all17.log，及對應 /tmp 腳本。原封重驗先前實證的來源準備重開、非法日期仍可 forged Manage、來源不匹配、錯 Slot 編輯及 IME 問題，無未解決 blocker。
- 最後完整工作區測試／build及只含明列檔案的暫存副本結果，提交前另記於下方。
- 第一個中間版本完整1288/1289：附件既有3秒辨識 worker 在忙碌測試時逾時，並非全套通過；原附件接受案例單項1/1重驗通過。隨後依序完整1292/1292及build14.45秒通過。上述為最後空日期修正前結果，不冒充最後版本；最終記錄另列。

## 真正畫面與資料證據

CUA IAB 隔離服務 127.0.0.1:64048，既有四老師／300學生／六課程；原使用者 localhost:5173 及其資料沒有修改。本片只在隔離資料新增兩筆驗收 Slot：10-23 13:00 關聯 Leo 第2堂，以及10-24 Maya 16:00獨立45分鐘，後者經既有真保存改16:15。未直接填 Paid，沒有改原正式排課或學生付款。

- 1280中文：Course → 公開課表 → 10-23管理 → 修改正式課堂：原生表單 date10-23/time13:00/session2；X → 同Slot detail → Close → 預覽from10-23，focus管理時段，scrollTop383。
- 內部備註「只供老師核對：此項不可出現在公開課表」僅在正式管理詳情可見，預覽DOM不含。
- Standalone 真正保存16:15後，回公開預覽重新讀並顯示16:15；重新載入網站頁面及再次開預覽仍有13:00與16:15，非成功toast推定。
- 真正無Cookie匿名 GET 同課程／10-23，兩筆時間13:00／16:15，回覆沒有remark、excludedStudentIds、studentId/students、scheduleId/sequence、teacherIds/roomIds；/tmp/beamal-public-preview-anonymous-proof.json。這是匿名資料證據，不代替未開放的公開報名。
- 390中文／768英文／1280中文，頁面無橫溢、header/footer在視窗內、body獨立捲動；手機dialog左右各8px、內文16px，footer頂760底835於844高視窗。部分圖需內捲看下方Slot，不把只見loading當完成。
- 390下一週10-31–11-06顯真正七日無Slot；返回前週可恢復。已實際清空日期發現矛盾並修正，最後畫面驗證另記。
- Leo真登入→獲授權Course，新管理入口0；Chloe真登入→自己的My Calendar、沒有管理入口及私人dialog。正式偽造／直接讀的回歸另由host／既有服務權限測試覆蓋。

截圖：evidence/public-timetable-management-20261015/。最終日期修正重建後再補同版錯誤／恢復畫面；控制台與鍵盤結果另列。

## 尚未完成

公開Regular／Trial／Class Full／Trial Full組合、7–30日視圖、公開課型色與圖例、整體人工管理和設定歸屬、正式可預約資格及訪客申請鏈仍待UI／政策／功能對應；現有七日與顯示預設保留，不能把本片標成整個UI-V2-07或W-04～W-08完成。無新增未確認預設，主要項目沒有改列minor。

仍須完成所有UI、其餘功能、代表性報讀／歷史分布、效能及27個最終驗收。main／AGENTS.md／Goal範圍未改；其他協作者未知未提交檔案保留。Git提交／push以最終實際結果為準。

## 最後凍結結果

- 日期修正後完整工作區 `npm test --prefix sample` **1295/1295、0 fail/skip/cancel、52.296289584秒**；/tmp/beamal-public-preview-full-final.log。隨後build成功3.04秒。
- 最後僅preview CSS收窄重複margin，減少無用捲動；同版再次build成功，/tmp/beamal-public-preview-final-css-build.log。功能來源未再更改，不無意義重跑相同邏輯測試；提交快照全套另記。
- 最後CUA：768英文清空欄值確為空、aria-invalid=true、課名保創意繪畫、Manage0；Refresh回原合法10-15、錯誤清除。390中文同樣空值及錯誤，footer bottom835、無橫溢。
- 最後1280中文緊湊排版，兩個Manage button均高49px、bottom792.68，小於footer top804，可在首屏操作；390及768重新截圖無橫溢、footer bottom835／981。手機管理detail→Close回同from10-23及管理入口，body scrollTop428.5。
- Tab由預覽最後Close循環到header Close，焦點仍在dialog；Escape關閉後回Course月份2026-10及Public timetable入口。
- 控制台只見4則chrome-extension密碼管理content_script的UsernameElementUniqueID null錯誤（切換mock登入期間），未觀察到此次網站來源的JS error／warn。沒有將瀏覽器擴充錯誤改寫成網站已修正，亦不聲稱整個環境完全無錯誤。
- 真實角色畫面與匿名HTTP、UI製作與業務保存界線如上；此片只對新增管理鏈負責，未把全部公開頁或Goal標完成。

## 提交候選最後覆核

- 只含明列 staged 程式及文件的乾淨 checkout-index 副本：npm ci exit0；完整測試 **1280/1280、0 fail/skip/cancel/todo、87.814335917秒**；隨後 build exit0、8.38秒。差15項是工作區既有未追蹤 staff-roster-groups 測試，沒有將該協作者檔案加入本提交。日誌 /tmp/beamal-public-preview-staged-{install,tests,build}.log。
- 最後獨立 staged diff 覆核未見嚴重 blocker；日期草稿／canonical查詢／匿名邊界與17組驗收同版。
- 原date-error-390-zh.png為錯誤縮放截圖，已排除並以新CUA390×844實際畫面替換；空日期、明確錯誤及底部操作完整可見，Refresh實際恢復七日結果。原圖不當通過證據。
- 最新原使用者本機人物核對：300個不同中英文姓名、生日12月份、3–18歲、239家庭（193一子女／31兩子女／15三子女）及4位active老師；35項人物／保留人手修改回歸通過。實際登入原localhost查看Chloe資料，並非重建資料庫。上述人物合理性不等於300人已報讀／Paid。
