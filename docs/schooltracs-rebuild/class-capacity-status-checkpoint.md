# 指定一堂的手動 Full／Available：限定檢查點

更新：2026-10-15。依 [本片規格](class-capacity-status-spec.md)、Notion §5.4 第94–97行及 §3.1 第50行。這片處理 Admin 對正式某一堂的手動班額標記；保留完整 SchoolTracs＋Notion、Beamal風格、圖片、中英文及手機目標。自動按已確認學生人數判定、Enrollment／Attendance／超額政策及整個 C-04／C-05 尚未完成。

## 效果與資料界線

- 使用正式 `scheduleId`＋固定 `sequence` 辨認某一堂。移日或換老師仍是同一堂；取消後 Undo 保留既有標記，新複製的排課不借舊標記。Standalone Available Slot 沒有正式班次引用，不顯示班額標記。
- Admin 開表先讀目前狀態與排課來源版本，只能選 Full、Available 或清除手動標記。保存保留開表版本及同一重試識別；衝突保留選擇，Cancel／Escape／Back 不保存。授權 Teacher 只讀；不建立新帳戶或授權。
- 班容量與 Trial／Rescheduling 配額不同。已確認人數及自動狀態目前維持 null／未知，不能把空名單、示範 bookings 或 Trial 配額當成實際人數。手動 Available 是管理標記，不免除未來報名的容量及資格檢查；清除後現階段恢復未知。
- 日／週／連續日子／月／List、普通課詳情與同堂 private linked Slot 使用同一狀態。紅／綠點獨立於老師主色，未知保持中性；不替多老師指定主老師，也不按 legacy 姓名配對。公開回覆及 revision 不添加私人班額狀態。
- 狀態有獨立版本與修改記錄，不改排課／Slot自身版本、課程費用、日期、老師指派、Trial／Rescheduling 配額或 held reservation 身份。較新狀態與較新來源事實分開合併：不能因較舊 linked 投影退回標記，也不能拒收整筆較新 Slot 配置。

## 目前證據表

| 證據 | 已取得結果及限制 |
|---|---|
| SDK | 新2案例先 genuine RED（正式讀寫方法尚未存在），Root接線後全 **23／23，約344ms** 通過；完整 query／immutable occurrence 路徑、首次版本0、來源版本、Full／Available／nullclear、固定key、CSRF及409，不送容量／quota等其他欄位。 |
| 獨立主流程 | **6／6**，已納入最後完整前端275個案例，保留全部舊斷言：fresh unknown／Cancel；Full ACK＋List503／重開Available／clear及相同503不重畫；開表v4遇背景v5、固定key、Cancel／Escape／Back；5檢視有效單堂老師色＋linked／另堂unknown／multi與legacy不變／Standalone不借標記；Teacher唯讀與舊身份401／403不能影響新draft；晚ACK及雙方向linked狀態合併。補強放在原案例，沒有新增第7例。 |
| 純UI | Root報新 `class-capacity-status-ui.test.mjs` **8／8** 通過，真helper已注入流程測試；未知／合法狀態點、三選一、版本及雙語標記。不是真正瀏覽器、位置或可讀性證據。 |
| 真HTTP | Backend worker報最新新套件 **6／6，4.54秒**：v0／Full／Available／clear、持久／audit／重試／角色與有效堂範圍、來源版本、取消→Undo及新複製身份、linked／public界線。此前新6＋既有Available12合計18／18亦通過；不將它當整套測試。 |
| 獨立完整前端／SDK | 最後雙方向合併修正後完整 **275／275，7.9092秒、exit0、0 fail／cancel／skip／todo**（flows252＋SDK23），`/tmp/beamal-class-capacity-front-final-after-reverse.log`。不是Root整套npm；先前275／3.7007秒只屬反方向review前結果。原274／275卡片class尾空格已由Root修正，保留舊exact斷言，沒有降低驗收要求。 |
| 真review回歸 | **資料單調同步**：global已知v3但Slot ownv2附nested v1曾RED，修正後接受新配置並保同ref狀態v3；反方向linked先讀v3 Full、global仍v2 Available亦先RED（`/tmp/beamal-class-capacity-reverse-linked-red.log`）再GREEN（`/tmp/beamal-class-capacity-reverse-linked-green.log`），晚listv2不退版。**重複錯誤不重畫**：原ACK案例相同503回覆實測第2次1整頁替換，先RED（`/tmp/beamal-class-capacity-repeat503-red.log`），Root改只在錯誤訊息改變時設dirty後GREEN（`/tmp/beamal-class-capacity-repeat503-green.log`）；不阻止其他真資料變動重畫。 |
| Root最後全套／依序build | 最後runtime凍結後完整 **512／512，38.2358秒、exit0**，`/tmp/beamal-class-capacity-final-full-test.log`；隨後依序build **2.04秒成功、exit0**，`/tmp/beamal-class-capacity-final-build.log`。獨立review最後反方向、重複錯誤及焦點PoC亦GREEN，限定範圍沒有未修required。不沿用前片490或以275前端套件代替完整檢查。 |
| 真桌面畫面：保存／標記／老師色 | 最後build的本機GUI：v0／source2未知→Full v1；普通同堂及linked Available Slot均顯右上紅點，Teacher C原橙色`#b9772f`不變，Standalone無班額點。只改seq1指派C→B後仍Full v1、來源source3，主色藍`#426ea8`。清除→v3未知、已確認人數顯`—`；再Full→v4。日／週／Custom／月／List五檢視真畫面均Full＋藍色，seq2仍未知。沒有把手動Full當成已確認人數。 |
| 真桌面畫面：衝突／Teacher只讀與焦點 | **同一Admin帳戶兩個視窗**：第二視窗保存Available v2，第一視窗持舊v1保存得到409、Full選擇仍保留；不是兩個獨立Admin帳戶的GUI證明。真Teacher B唯讀、沒有編輯入口，背景變Available時只更新標記、原`lesson-tab-students`焦點保留。[衝突草稿](/tmp/beamal-class-capacity-conflict.png)、[Teacher唯讀](/tmp/beamal-class-capacity-teacher-readonly.png)。 |
| 真桌面畫面：固定堂次／來源新鮮度 | 只移seq1由10月16日→17日，仍Full v4／source4；取消來源source5→Undo source6仍是同一immutable sequence及Full。還原10月16日後source7，最新重開表單讀到version4／sourceVersion7、Full checked。沒有以日期或列表位置另建班額記錄。 |
| 匿名公開核對 | Full保存前後無cookie public JSON**逐byte相同，包含revision**；私人班額標記沒有加入公開回覆。這是本片真HTTP核對，不是SchoolTracs Chrome對齊證據。 |
| 真手機畫面／DOM幾何／鍵盤 | 真responsive viewport `390×844`，page scrollWidth390、editor width374／client373，無橫向溢出；英文及繁體中文表單已呈現。Save按鈕按Tab回到Close（`data-action="class-status-cancel"`）。[英文手機截圖](/tmp/beamal-class-capacity-mobile-en.png)、[繁中手機截圖](/tmp/beamal-class-capacity-mobile-zh.png)為部分捲動的IAB captures，**不作完整header／footer外觀證明**；視窗內幾何由實際DOM核對。 |
| 真不保存／重新載入 | 在手機把Full草稿改成未保存Available，Cancel及Escape後重開均仍Full／version4／source7。未保存Available時browser Back離開至about:blank，沒有Save；桌面重新載入最新App→時間表Month→fresh editor仍同Full／version4／source7，證明Back未誤寫及頁面重讀已保存狀態。[最後中文桌面月檢視](/tmp/beamal-class-capacity-month-final.png)；本輪GUI沒有重啟service，SQLite跨重啟持久性由前述6項backend測試證明。 |
| 未做的部分 | 未做獨立第二Admin帳戶GUI、真GUI 503、SchoolTracs Chrome新對照、自動Full／Enrollment或300 active大檢查；503保存保留／不重畫只由VM流程與獨立review驗證。部分手機截圖不證明完整頁面外觀，所有上述截圖為本機暫存驗收證據，不是部署或對外交付連結。 |

## RED分類及完成邊界

新功能最初缺方法／課堂詳情沒有入口是預期的功能 RED；pure helper存在後才真import。測試準備上的舊modal fake未反映真整頁DOM替換、換日期窗口未等待最新read、新身份未重新讀其授權排課，均已修正測試準備，不列產品bug。較舊linked nested狀態退版、重複503整頁重畫則有獨立可重現證據及永久回歸。只調整標準DOM模擬，不削弱舊斷言。

Absent／Sick／個別Pending如何反映正式班額仍須完整Enrollment／Attendance實作；本片沒有製造0佔用、自動7／8→8／8或真報名結果。Trial Submit／Total公式、Convert／Family／付款／Receipt／通知／To-do／Staff等既有核心需求繼續保留，待答政策不能靠時間或手動綠點批准。

原48／全111來源狀態及整頁對齊不改；4老師／300 active學生／6課／3–18歲本機大檢查未完成，不轉minor，也不把整Goal標blocked。本檔不填未知Commit／push／部署／iOS成果。
