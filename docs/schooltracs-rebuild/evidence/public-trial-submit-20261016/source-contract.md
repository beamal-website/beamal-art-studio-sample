# 公開 Trial 真提交：來源、最小完整鏈與未決政策

2026-10-16；Research only。只寫 `/tmp`，未改 repo／DB／服務／Git，未操作 IAB。讀本機 2026-10-14 Notion 快照與現有 checkpoint，非最新線上 Notion 宣稱。

## 先決結論

已確認：**exact Course + Slot → 填表／核對 → Submit → 唯一 TrialRequest + 佔一 Trial quota + 相關老師 System Notification + 可處理唯一 To-do → 老師查看及人工 WhatsApp 確認／Reject → Reject 釋這一位但保申請／Applicant 歷史**。不能以匿名成功頁或只有 quota 寫入稱完整主流程。

**未決的真提交最低必填資料是實際阻擋政策，不能把之前 UI-only 的「全可空核對」誤當已批准真提交規則。** 同時不可硬加雙語姓名、3–18歲、電話長度、家長姓名等商業門檻。提交不等於已確認上課、付款、正式入班、Student、Login／家庭授權。

## A. 本輪重新核對的來源

### 原 PDF（已重看完整 p.1、p.5、p.6）

原檔 `/Users/yausiuhei/Downloads/Beamal web & app rough brainstorm remark (eileen.pdf`，SHA256 `ffffe3efea424f501c13172e7ea9d80056a041158f3d4ed1e969de64b5d3a55e` 本輪重核一致。

- **p.1** 左欄：Homepage→Course→詳情→Available timeslot→預約試堂→Form。列 `Student 中 & 英 Name`、birth date／年齡線索、就讀學校、介紹人、Course、interested apply timeslot、WhatsApp no、Email、Submit。沒有可靠必填星號／全部必填／至少其一規則；括號年齡不是強制3–18門檻。底部藍字是內部 Teacher To-do／Trial class request、確認日期及 WhatsApp 聯絡、學生資料入系統方向。
- **p.5** 家長 App／續報及付款的脈絡有自動出單 Email、Receipt 保存帳戶；不是公開 Trial Submit 已付收據觸發規則。家庭同帳戶兄弟姐妹亦不能變成「電話相同就自動合併」。
- **p.6** 老師出單→Send→Parent App待確認，Confirm Payment／Pay 分開，不能把付款流程拼到匿名試課 Submit，或憑它自行判 Paid/Convert。

### 本機 Notion／Goal 精確行

`docs/schooltracs-rebuild/notion-requirements-source.md`：
- `:23` 試課字段＋明確必填／選填／校驗未決；`:200` P-05 再明必填、是否另設確認狀態、拒絕／取消／改期後通知與重用名額待定。
- `:47–50` 三種額度分開；Submit 即佔 Trial，一個 Reject 釋一位且保歷史；正式課堂 Capacity／出席不可混算。
- `:51–60` 完整鏈：建 TrialRequest、通知老師及 To-do；老師自行 WhatsApp；試課結束未記結果持續 To-do；Absent／Enrollment Confirmed／Pending Follow-up 與實際到場、報名意向分開；Convert 前皆 Applicant，Convert 要手動。
- `:64–66,70,77` actionable To-do 綁具體 request，去重、可處理；要行動的事件同時有即時系統通知，並非任意 toast 就算完成。
- `:124` System Notifications 與指定老師發出 Messages 分開。
- `:209–210` 最後一位併發不超額，Reject可恢復；Enrollment Confirmed不自動Student。
- `:225–229,243` 公開使用同一正式 Overall Slot；PublicVisibility 不修改真資料／資格；Full不可再提交；Reject恢復可用。Goal調和後的已發布正式Class與TrialFull顯隱仍分離。
- `:267–270` 兄弟姐妹獨立Profile／記錄；不能只因相同電話自動合身份。
- `:272–276` Student Profile ≠ Login／App激活；激活前置尚待確認。
- `:318–323` EX-01：TrialCap2，1/2→Submit第二人2/2阻第三人；Reject第一人回1/2且Rejected歷史保留。
- `:324–329` EX-02：課後未處理持續follow-up；Enrollment Confirmed仍Applicant，Edit Details與Convert獨立。

`ULTIMATE-GOAL-PROMPT.md:225–234` 保留中英文欄而不逼兩名；referrer隨Applicant/Convert延續；Submit唯一申請／佔位／通知／To-do，Reject釋位；不自動Convert／Family合併。`:65` 自動文件與寄件只測試寄件箱、Paid Receipt需人工核款，不能假設Trial Submit即寄已付Receipt。

Register（`notion-requirements-register-source.json`）：
- T-01 `:735–742` Slot；T-02 `:743–750` Submit/Reject quota；T-03 `:751–758` Teacher通知／WhatsApp；T-04 `:759–766` 課後Todo；T-05 `:767–774` 結果；T-06 `:775–782` Applicant；T-07 `:783–790` Edit/Convert；W-03 `:831–838` 公開表。
- IDs：T02 `3f5936c332a981459b41cf71522ae02d`、T03 `3f5936c332a9817e85a0d906532ca4f2`、T06 `3f5936c332a9814789aef89888438cd3`、W03 `3f5936c332a9815bafd2e07edb21d81f`。

## B. 表單：資料需求 vs 未定必填

| 欄位 | 可靠依據／本片界線 |
|---|---|
| 中文名 localName／英文名 fullName | PDF p1明分欄、Goal225；不能逼雙名，是否至少一名必填仍需定 |
| DOB | PDF p1；有填須真日期／非未來可作技術校驗；不造預設生日，不自行設適齡硬資格 |
| school／referrer | PDF p1；推薦來源保留，不能同名查配或自動派獎 |
| parentName | Notion23相容延伸；不能把學生名當家長名，亦不當Guardian已驗證 |
| WhatsApp | PDF p1／Notion54老師聯絡用途；真提交是否必填、可否僅Email、地區碼格式待定，不假稱固定長度政策 |
| Email | PDF p1；存在不代表Login或寄真Email；選填校驗已有UI，必填未定 |
| gender／remark | 現有可選UI延伸，非p1明列必填；不收額外HKID／健康／文件作新門檻 |
| Course／Slot／日期時間老師 | 上一步canonical公開選擇，不能由表單姓名或hidden字段改目標；不再要求重選已選課／堂 |

現有 `public-trial-ui-checkpoint-20261016.md:3,7–19,43–45` 明說只有 UI、未接submit/Applicant/quota/通知，容許全空核對是因最後Submit disabled。`public-trial-ui.js:29–47` 是現有基本格式／長度檢查，不是已批准全空可正式建檔。

實際接線落差：`sample/server/people.mjs:4,22,89–92` 現有 create需displayName、admin actor且建Applicant；匿名試課不能授全People create權，也不能用Chloe／登入孩子／虛構人名補未提供學生名。若客戶尚未定最低字段，應先向Root具體標出這個依賴，或採明確unknown身份的獨立request設計（屬需要Root批准的技術方案），不能暗中變商業必填。

## C. 成功、通知、狀態的正確含義

| 觸發 | 已確認 | 不可自行推進 |
|---|---|---|
| Submit成功 | 一Request＋一Trial hold；Applicant記錄／歷史可查；相關老師系統通知＋可處理唯一Todo | 不是已確認上課、Present、Enrollment Confirmed、Student、Paid、正式入班或Login |
| 老師聯絡 | 自行經WhatsApp核時間 | 沒有自動發WhatsApp的來源；不可聲稱已寄到家長 |
| Reject | 精確該Request→Rejected、釋其Trial hold、保Applicant/歷史 | 不刪人、不刪其他申請、不退正式班位、不合家庭；對訪客自動通知的渠道/文案尚待定 |
| 試課結束未記結果 | 唯一可續辦follow-up Todo持續存在 | 不是自動Absent、釋位或Convert |
| Enrollment Confirmed | 報名意向、Applicant仍保留、Edit Details＋手動Convert入口 | 不自動轉Student、付款、課包或帳號 |
| 收據/Email | Goal保留付款脈絡自動工具，測試寄件；Paid Receipt僅人工核款後 | Trial Submit不是已確認自動寄Paid Receipt的時機；不能因表有Email就傳真外部信 |

對訪客最小成功結果應是「申請已收到，待老師聯絡／確認」，顯示其確切course/date/time及不洩私資料的reference。這是符合已確認語意的UI提案，沒有來源指定確切成功文字或成功後自動跳哪頁。不得宣稱確認上課／通知已實際送達，除非真有相應記錄與送達證據。

## D. 建議最小完整實作鏈（工程提案，不冒稱來源逐欄API）

1. 沿既有公開Course／混合TT的exact Slot→目前details/review/back/cancel，不重建品牌頁。Submit前與server transaction內都重核 canonical已發布／active/sourceAvailable/trialEnabled、實際Trial quota，rejectFull/hidden/moved/foreignSlot；未知不可變0或可用。Regular ClassFull與TrialFull獨立，不憑ClassFull拒已明確開放的Trial quota。
2. 單一原子交易寫 TrialRequest、只這位Applicant資料（或明確待資料補全的request）、一個 Trial hold、可追蹤notification事件及去重To-do；中途失敗全部不變。用穩定idempotency key防doubleclick／timeout/lostACK後多建人/多佔位；同key不同payload拒。
3. 資料以穩定 requestId／slotId／courseId／ApplicantId 關聯；多位相同姓名、同電話／Email都不得自動合家庭、正式學生或舊Applicant。技術重試去重不等於跨申請辨認同一真人；同人重約／不同家長重複提交的業務合併政策未定。
4. teacher路由用正式Slot effective teacher resource IDs＋明確account links，不按顯示名或只取第一老師。普通負責老師/Admin可見對應request；只讀grant不能自動升成Reject寫權。若負責resource無登入關聯，要有明確可追蹤unrouted狀態／Admin處理，不能假稱已送到不存在帳戶。具體fallback收件人是工程設計需Root明定。
5. 最小內部入口須讓老師由Trial Requests Todo進exact request，看到提交資料／真選Slot，Reject並回同list/位置；已Reject再次操作不再釋其他hold。Applicant在Admin既有名冊可查、Rejected保留；不要為一筆申請打開Teacher全校People讀寫權。通知／Todo要同權限源，不用operations-ui假fixture代真資料。
6. 成功ACK只回新提交者需要的白名單reference／public summary；不能返已有Applicant／其他request／family／teacherlogin／名冊／rawprofile。匿名request查詢如需後續查看，必須有不可猜的claim能力或不提供公開GET；不能因知道requestId／電話就讀任何申請。
7. ACK確定後才顯收到申請；失敗保草稿、滿額提示重新選、可取消回原range/filter/scroll；來源改變不默默換老師時間。lostACK同key恢復確切一次結果，不按舊快照再佔位。成功清私密草稿，重新開申請不是上一家庭資料。
8. 不擴Paid／Convert／AppActivation／Family合併／自動外部訊息。課後結果及持續follow-up是已確認後續主功能，若本片只做Submit→接收→Reject就明列尚未完成，不當minor或整套Trial完成。

## E. 仍需明確決定，不可工程自選

- **最低提交字段**：至少一個學生姓名？WhatsApp是否必填、可否用Email替代？DOB是否必填？不應把這些問題合成「所有欄必填」。未定前不能用匿名空白表成功造成假人。
- P05：申請另設confirmed狀態？Cancel／Reschedule／Reject後訪客通知、可重用名額／重約邊界。已確認Reject釋位本身不可倒退成未定。
- Total Capacity與Trial／Rescheduling／正式班佔位的合算及特批規則；現有 `available-slots.mjs:70–71` 各quota分開、`totalReserved:null`，沒有可靠Total公式，不能私寫總和規則冒充來源。
- Course type／年齡／同人重約資格、截止／時區，若尚無已確認規則不能從示例推硬拒。既有UI真日期與非未來DOB基本校驗可保留。
- 多老師／無account資源的收件與處理權細節；訪客成功結果文案／reference查詢能力；anti-abuse技術可設，但不暗建登入／CAPTCHA／法律同意門檻。

## F. 必須先RED的結果驗收（來源主線）

1. 最後一Trial位，兩不同client併發只一成功；失敗一方無Applicant/hold/Todo/notification殘留。重試同key唯一一筆，不當另一申請。
2. 第二同名course+slot、移日linkedSlot、跨月多課公開TT都綁exact ID及canonical expected snapshot；wrongcourse/hidden/disabled/full/unknown來源不借第一筆。ClassFull+TrialOpen與ClassOpen+TrialFull分別驗。
3. 表格全字段及referrer持久；Reject仍Applicant、不改Student/Paid/Login/Family/member grants，不增正式student_sessions或改Full／attendance。
4. ordinary負責Teacher只見處理本人request；其他／readonlygrant不能Reject；撤link／換effectiveTeacher於bodyawait/cache replay重新授權。相同顯示名教師不誤派通知。
5. Reject精確一hold、狀態CAS；重按／lostACK只釋一次，1/2→2/2→Reject→1/2，其他request／調課quota／正式人數不變；Rejected歷史可查。
6. 一個request有可處理唯一Todo＋系統通知，不重複、普通成功toast不代替；記錄與UI可查，無真WhatsApp／Email寄送宣稱。
7. Submit pending防重按；錯ACK／lateACK／換route／換身份不錯報success或復活私表；來源full／錯誤保草稿；success結果清楚仍待老師聯絡。
8. 無session也可合法公開提交，但公開GET／猜ID／XSS／rawerror／其他人同電話姓名都不洩資料；業務error與network timeout可辨識；重啟保存、兩個登入讀同canonical來源。

## G. 本輪 Chrome 觀察及限制

- 唯一選取既有Chrome browser1；讀文檔並命名 `🔎 Trial application reference`，`user.openTabs()`本輪讀到user原tab846621913：`Sales - SchoolTracs`，`https://web.schooltracs.com/v4/web/sales/courses?b=2&o=yausiuhei07`。
- 既有tab `playwright.domSnapshot()`：3000ms `Emulation.setFocusEmulationEnabled` timeout。讀 `browser-troubleshooting`後，只在同browser對該列出tab `cua.getTab` 重新綁定一次，仍10000ms同命令timeout，已停止。無navigation／填表／submit／設定／新tab，也沒有需清理的自建頁；user原頁保留。
- 所以本輪沒有新鮮SchoolTracs Trial畫面／必填／Submit／Reject動態觀察。舊 `public-trial-ui-checkpoint:10`／`/tmp/beamal-public-trial-schooltracs-review.md`記的是先前Store Preview空課程／公開店關閉，僅作歷史有限證據，不能當本輪確認、更不能拿它否定客戶明確需求。
