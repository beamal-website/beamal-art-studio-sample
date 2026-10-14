# 正式課堂類型：配置與保存規則的限定檢查點

更新：2026-10-15。依 [本片規格](class-type-spec.md)、[Notion主文](notion-requirements-source.md) §5.5第99行／C-06、§5.3第89行／C-02及正文§十P-10第205行。完整SchoolTracs＋Notion目標、Beamal風格、中英文、手機版與原48／全111列來源狀態保持；本片沒有把學生調課、Enrollment或整頁驗收標成完成。

## 已接入的效果

Admin可維護Regular、Special及自訂類型的名稱、啟用狀態，以及「允許學生自行申請調課」的允許／禁止／尚未設定三態。Regular或Special名稱本身不決定政策，兩個預設類型初始規則為null；Admin明確選擇才變成true或false。Teacher只讀目錄與自己／獲授權堂的已保存規則，不增加編輯權或其他班次的查看權。

Course保存新排課的預設類型ID。新Schedule可沿用預設、明確另選或清除，保存時由服務複製當時的名稱及規則；這份「快照」就是該堂保存時的設定，之後目錄改名／改規則及Course改預設，不會偷偷改已有課堂。舊資料沒有類型就保持未指定，不按category、session、老師姓名或顏色猜。

已存在的排課預設「保留目前」，省略類型欄位保留歷史快照；明確選用才採開表所顯示的目錄版本。單堂只改固定sequence；只改時間或重複規則的Following保存，保留選定堂及另一堂的類型例外。停用類型可留在已有課堂，新選用／複製須使用啟用類型；不自動降為Regular。移日、取消／Undo或換老師不改已保存類型。

日／週／連續日子／月／List按已保存類型ID篩選，普通課詳情及List呈現種類與規則；private linked Available Slot使用同一實際堂次的快照。Standalone不借類型，公開回覆及revision不增加私人類型設定。類型篩選只是顯示條件，不新增授權、學生名單、座位或付款結果，也不改老師主色及手動班額標記。

開表凍結可選目錄、Type版本及Course來源版本。背景更新不能替換已顯示規則；409表示資料或來源已變，保留草稿讓使用者取消後重開核對。同一儲存要求保持固定重試識別，成功回覆後讀取失敗仍保留已確認資料，Reload只重新讀取。身份／頁面改變後舊回覆不能污染新表單；忙碌時鎖欄位並把鍵盤焦點留在對話框。

## 目前證據表

| 證據 | 最新結果、所證明的效果及限制 |
|---|---|
| 來源觀察 | Root在SchoolTracs Chrome只讀Add schedule，看到Course、color、日期／End、時間／duration、Teacher／Room、Capacity／Session及文字欄，**沒有觀察到Regular／Special／自訂類型欄**，隨後Cancel，沒有Save。這是Notion追加要求，不聲稱SchoolTracs已實作相同設定。[已保存來源截圖](evidence/schooltracs-add-schedule-20261015.png)為專案內耐久證據。 |
| SDK | 新2案例先真RED（classTypes／createClassType等方法尚未存在），接線後全 **25／25** 通過；最後完整前端也包含它們。驗GET revision／unchanged、POST三欄白名單、PATCH開表版本、ID編碼、null／true／false、固定key、CSRF及409；不讓偽造kind、ID、版本或時間進寫入欄位。 |
| 獨立公共主流程 | 新 **6／6**，最後已納入完整283：三態／啟用／ACK後503及Reload只GET；固定v7遇背景v8、Cancel／Escape／Back不寫；Course預設→新Schedule繼承且舊堂／費用不變，selected disabled inactive default被FormData省略時保留ID、明確空值才清除；selected lesson保歷史／明選最新、時間及repeat Following保類型例外；五檢視／linked與Standalone／Teacher唯讀；凍結Course及Type版本、409草稿、pending焦點與舊身份success／401／403及Back晚ACK、同頁新manager不被舊opening覆蓋、共用paint:false read結束後可Close／Reload。scoped流程使用外部服務ACK驗表單與畫面套用，**不代替真HTTP的繼承／例外算法驗證**。 |
| 純UI | Worker最後 **14／14**，包括三態、合法locale撞名區分、歷史Keep不借新目錄規則、未知Special及讀取錯誤時Reload入口。真helper注入流程測試；不是真瀏覽器、手機幾何或外觀證據。 |
| 真HTTP | Backend最後新套件 **9／9，9.4325秒**；相關回歸 **29／29，13.2700秒**。驗Type建立／更新、版本／固定key／audit／交易、Course default／新Schedule snapshot、明確選用／清除、停用保留、scoped規則與Teacher／public邊界。第9例由獨立真HTTP重現「single Special後只改Following repeat並Keep，selected堂錯退Regular」再修正；不以mock ACK代替這項證據。較早8／38／23為先前子集，沒有加總成最新完整測試。 |
| 獨立最後全前端 | required review修正後最後 **283／283，51.3002秒、exit0、0 fail／cancel／skip／todo**，包含258 flows＋25SDK；`/tmp/beamal-class-type-front-after-review-final.log`。原case3／6補inactive default omission及opening／共用read成功或503的永久回歸，沒有新增第7例、沒有削弱舊斷言。較早283／6.3095秒為後續review前的歷史結果；本列仍不是Root完整npm或真GUI。 |
| 獨立review及真回歸 | selected single type／Following repeat資料遺失已由Backend以不可變rule副本修正，永久HTTP第9例通過。前端saving時零enabled controls的Tab焦點、ACK後GET503誤說保存／fee金額失敗均先RED再修正；Reload保留成功資料。完整前端一度281／283，兩個原Course身份回歸發現換身份後courseSaving未清；Root同步清identity的saving／job，保留late-job守門後原2例及當時283全通過。後續獨立public PoC發現inactive Course default的selected disabled option被Native FormData省略，name-only Save錯送null清預設；原case3追加真RED，仍保留明確選空值才清除的斷言，已修凍結預設的fallback，定向1／1 GREEN（`/tmp/beamal-class-type-inactive-course-omission-green.log`）。同頁較舊Course／Schedule opening覆蓋新Type manager的獨立PoC已有intent guard修正；原case6追加共用read後真Close驗證，另抓到read已完成而manager仍busy、Close disabled的真RED；Root按manager／generation／context核對後在view狀態改變時重畫ready或error，同case的Course Edit與TT Add、success與503、Close／Reload均GREEN，最後283重跑通過。 |
| Root完整npm／依序build | required review修正後最後完整 **543／543，70.7444秒、exit0、0 fail／cancel／skip／todo**，`/tmp/beamal-class-type-final-after-review-full-test.log`；完整npm結束後依序build **4.11秒成功、exit0**，`/tmp/beamal-class-type-final-after-review-build.log`。不沿用修前64.3148秒或build4.54秒。 |
| 真GUI環境及5180界線 | 以下真GUI全用最新build的 **127.0.0.1:5181、全新純虛構SQLite資料**，資料在/tmp、沒有複製.data。Root暫用既有main5分頁驗，已還原localhost:5180/account正常登入畫面及viewport；5181驗後正常關閉exit0，5180仍運行且資料未改。使用者沒有提供密碼、無需額外操作。這是同一程式的真HTTP／GUI驗收，**不是5180現有資料的功能驗收**。 |
| 真Admin配置／預設／快照 | 目錄實際呈現Regular允許v2、Special尚未設定、自訂禁止v1。Course預設保存該自訂ID，兩費用$300／$850不變；10月24日新單堂沿用自訂禁止v1。目錄再改允許並停用v2，Course只改名稱及還原名稱時，Native FormData省略selected disabled option仍保同一預設ID，沒有清除；已有新堂仍禁止v1。自訂其後重新啟用為允許v3，證明目錄改動與既有快照分開。 |
| 真scoped Keep／明確採最新／五檢視 | 第一套排課10月16日單堂選Special，10月23日仍Regular／null規則；Following由13:00改13:15、count由2改3並Keep，第一堂仍Special，第二／第三堂Regular／null。Special篩選在日／週／連續日子／月／List各顯一個普通堂及一個linked，Standalone隱藏；linked詳情仍Special／null、手動Full與Teacher B藍色不變。再只改第一堂明確選自訂允許v3成功，10月24日先前的新堂仍自訂禁止v1；不把目錄版本套到舊堂。 |
| 真Teacher唯讀與公開白名單 | 真Teacher登入其B授權資料，普通堂及同堂linked均自訂允許／Full／藍；設定入口0、排課Edit停用、linked只可Close而無Edit，未知佔用人數顯—。[Teacher唯讀CDP截圖（當時viewport）](evidence/class-type-teacher-readonly-20261015.png)不作未實作學生名單的證明，詳情學生區仍可內捲。私人單堂類型變更前後，無cookie public detail的 **1074 bytes逐byte相同，包含revision**（`/tmp/beamal-class-type-gui-public-before-type.json`及after檔），沒有公開私人規則。 |
| 真手機／鍵盤／未保存退出 | 實際390×844、document width390，繁中及英文完整CDP截圖已核對：[繁中](evidence/class-type-editor-mobile-zh-20261015.png)、[英文](evidence/class-type-editor-mobile-en-20261015.png)；另補驗312像素緊湊布局。Save按Tab回Close；將允許草稿改禁止但未保存，Cancel、Escape及Browser Back後，Reload與重開仍允許v3，沒有誤寫。早期native getScreenshot的局部裁切檔未用作完整畫面證據。 |
| 本輪沒有做的GUI／完整業務 | 未做本片雙視窗衝突GUI、真GUI503注入或資料庫重啟GUI；衝突／競態／503依HTTP或283前端回歸，SQLite重啟持久性由真HTTP9例證明。5180現有資料沒有套用本片GUI變更；學生自行調課、資格例外、Enrollment／Attendance、整111項及300 active仍未完成。 |

## RED與完成範圍

修前完整543／543（64.3148秒）及其後build4.54秒成功保留為歷史；其後required review觸發修正，不能當作最後來源驗收。

新SDK缺方法、首兩個公共設定入口尚未接線，是預期的新功能RED；背景規則／來源衝突等後續案例在接線後直接通過，沒有倒稱每項曾失敗。新pure module存在後才真import；DOM模擬及「Not set」文案的測試準備修正不列產品缺陷。pending焦點、誤導讀取文案、舊Course身份鎖及Backend selected-type遺失均有可重現失敗及修正，沒有削弱原要求或用單獨通過掩蓋失敗的完整結果。

C-06本片只完成類型配置、選用及新班繼承的前置能力；還沒有正式StudentSession、訪客Trial申請或學生自行申請調課的服務交易，所以「允許」不代表已有可執行動作，「禁止」亦未作真學生操作拒絕驗收。P-10的試課／調課／補堂資格、例外授權及覆蓋規則仍待細化；C-02只多了類型條件，Eye、自訂條件組合、個人保存仍未完整。C-07名單／年齡／剩餘堂數、Enrollment／Attendance、自動Full及整C-04／C-05仍是核心工作。

直接／歷史Student及Convert前置、Total合算、公開Trial生日／必填、多人主老師政策仍等使用者回答；不由配置推定、不把整Goal暫停或降minor。下一步應接真Trial／To-do及Request／Payment／Enrollment關聯，付款確認與Convert仍分離；Family、Receipt、通知、Payroll等完整111項繼續。4老師／300 active學生／6課／3–18歲的本機大檢查未完成，早前300 Applicant分頁不替代它。本檔不填未知Commit／push、部署或iOS成果。
