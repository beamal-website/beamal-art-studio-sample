# 課包組合內容及額度 UI：來源／owner 契約

日期：2026-10-16（Asia/Hong_Kong）。獨立唯讀研究；未操作 browser、repo、DB。僅在此 /tmp 目錄渲染兩頁原 PDF 及保存本筆記。Root 負責 src.js 整合。

## 本輪實際檢閱

- 原稿：`/Users/yausiuhei/Downloads/Beamal web & app rough brainstorm remark (eileen.pdf`，40,000,896 bytes。
- 本輪 SHA-256：`ffffe3efea424f501c13172e7ea9d80056a041158f3d4ed1e969de64b5d3a55e`。
- 由 Poppler 重新渲染 p.1 / p.4，135 dpi，已以 view_image 目視完整兩頁。
- 渲染：`original-page-1.png`、`original-page-4.png`（本目錄）。不是引用舊摘要冒稱本輪閱原稿。
- 已核對現行 Notion 主文相關段落、PDF 比較及 Goal；未另取線上 Notion。本地 Notion 快照仍按其檔案記錄的版本使用。

## PDF 直接證據

1. p.1 在 Course 標題下，Junior class A 編為③、Interview class 編為④。這兩個條目之下有非獨立課程編號的 package① / package②，並用括號／箭頭把 A 與 Interview 連在一起。
2. package① 標 class A + interview (90mins)，下面為60mins、30mins，右邊 ×12堂。
3. package② 標 class A + interview (120mins)，下面為60mins + 60mins，右邊 ×8堂。
4. p.4 下半公開圖標題是 REGULAR CLASS (Junior Class A / K2 Interview Class) Schedule。格子同時出現獨立 A、獨立 Interview 及並列 A + Interview。
5. p.4 下半左下黃框明寫 A+interview package / 12堂90mins available，並在其旁列可用時間。這證明該組合也要在公開安排中可辨認。
6. 兩頁沒有寫 Course ID、Fee ID、schema owner、是否將兩部分當一個 Session、是否可分別消耗／補段。不能把 UI 表達層直接提升成已確認資料模型。

## Notion 直接證據及缺口

- `notion-requirements-source.md:22`（W-02）：課程頁顯示時長、說明與多個課包方案，後台維護資料；沒有定義組合 owner。
- `:127–130`（F-01/F-02 等）：多 items、可增刪改項目及總價，不等於原稿兩內容組合已完整建模。
- `:144–146`（F-07/O-04 相關）：人工 Confirm Payment 觸發課程、名單、課表及購買/剩餘數更新；沒有決定每成分扣額與單位換算。
- `pdf-notion-comparison-20261015.md:47,79,148–149` 與 PDF-GAP-05 保留組合時長／課次，排扣補待定；PDF-GAP-11 保留 minutes / visits / 期間，不暗換算。
- `ULTIMATE-GOAL-PROMPT.md:200–204` 明確允許一 Course 多 Fee／一 Fee 多 Course，並要求組合成分與分段時長；沒有替 owner 作最終政策決定。

## 可以採用的產品契約（推論／本片設計選擇，非 PDF 原句）

### 分層理解

- Course：教學內容本身，例如 Junior A、Interview。
- Package offering：某個可購方案含哪些內容、各項時長／課次配置。原稿同 A+Interview 有兩個變體，故不宜把 Junior A 的 Course 定義硬寫成唯一60+30組合。
- Fee：現有保存的收費模式、價錢、額度單位及總數，亦提供方案的合理操作入口。
- Order item snapshot：當次訂單實際列示／購買的方案快照；後來改 Course / Fee 不回頭改舊單。

Package offering 是概念分層，不要求本片新增正式實體、資料表或 API。

### 本片入口與 owner 邊界

可採 `package Fee overview → Package contents → Admin draft editor → Review → Back / Cancel`。只對 pricingModel=package 的已知 Fee 開啟組合內容入口；Teacher 可查看但沒有編輯權，本片不擴大角色政策。

此入口與「Fee 擁有正式組合定義」是兩件事。把 Fee 當本片草稿的操作錨點可採納，但最終正式 owner 尚待確認：內容可能屬 Fee、獨立 PackageOffering，或 Course–Fee 的關聯。UI 不應承諾保存後對所有關聯課程如何傳播。

尚未有模型時，已儲存內容顯示「未提供」。Admin 草稿可增刪／排序成分名稱及每項時長，核對頁回顯同一草稿；最終 Save 停用，明確短註尚未保存。草稿不改現有 Fee、課程關聯、排課或訂單，也不假填A/Interview到正式記錄。

## 多對多關聯的必要處理

- `store.mjs:79–83,124,144` 的 course_fees / fee.courseIds 表達已儲存適用關聯，不證明是「同時包含的組合成分」。禁止直接 map fee.courseIds 自動產生 Package components。
- 同 Course 有兩個 package Fee 時，每個方案都必須各自進入，不能共用該 Course 一份無方案識別的草稿。
- 同 Fee 由 Course A / Course B 不同列進入時，讀取的是同一 Fee ID / version；來源 Course 僅用來保留返回位置／關聯上下文，不默認是不同正式內容 owner。
- 本片草稿只存在當前 editor / review session，不能保存成正式 Fee 全域資料或暗中套到另一課程。返回時沿用既有 Course + Fee 的確切來源記憶，不跳到同 Fee 第一列。
- Fee ID/version 改變、關聯解除、換帳戶、撤權或來源失效，舊草稿不能重開、不能套到同名 Fee。

正式保存前最小待決問題：**同一個共用 Fee 適用多課程時，組合內容必須完全相同，還是每個 Course + Fee 可不同？** 原稿與 Notion 不能替使用者回答。這不阻止本片做暫存編輯／核對 UI。

## 原購額度：跨端共用唯讀契約

1. 唯一來源是目前獲授權、確切 order item 的 `pricing` 快照；至少綁 orderId + studentId + item.courseId + item.feeId，不能按名稱猜、取第一個 Fee 或讀現價補歷史。
2. `pricingModel=package` 且 packageType=minutes / visits（legacy lessons可呈現visits）及有效 packageTotal：顯示原單位。不得用分鐘除60、乘課節時長或四捨五入成堂數。
3. paid 才可稱「原購額度」；未 Paid 的草稿／待確認／待付款訂單只能稱「方案額度」或「訂單列示額度」，不暗示已購／已啟用。
4. `item.lessons.length` / 全單 `purchasedLessons` 是所選課節計數，與 packageTotal 不同；可獨立列「本單所選課節」，不得充當餘額。
5. Remaining 只有有來源明確提供、單位一致的正式 balance 才顯示；現有服務沒有便顯示未提供。Attendance、已過日期、待補、課節數都不能拿來推算。
6. 沒有成分快照就顯示內容未提供，不借目前 Course/Fee 草稿補舊單。沒有明確有效起訖就維持未提供；所選課堂起訖不是課包有效期，Booking Expiry配置亦不是已算出的到期日。
7. 月費模式沒有 Package unit / total 時不強行產生 visits；未知單位不可顯示0，未知／已知零不同。
8. 多筆／多孩子／多 item 分開，不跨單位或跨家庭合算；名冊、Order details、Student My classes使用同一純展示格式。

## 必留未決政策

- 組合是否同一堂分段、獨立排課、必須同時購買、能否單段補課。
- 成分課次、獨立或共用額度、minutes/visits如何扣減與退款回補。
- 60+30 / 60+60 / 12 / 8 是原稿方案示例，不是所有方案固定預設或唯一可選值。
- p.4 格子中的並列徽章不足以證明同一實體課室同一時刻一定同時教授兩段，不能據此建立排課或容量算法。
- 前述 owner 與共享 Fee 傳播政策。

## 本片可驗而不代決的出口

- 真入口可達；Admin 編輯／核對／返回／取消保留內容與來源，Teacher只讀。
- 原 Fee及兩個不同Course來源不串草稿；同名異ID不誤配；版本/身份失效清理。
- 可呈現兩個原稿組合及自由長名稱；每項時長與總額度分欄，不暗中生成排課／扣額。
- 原購minutes / visits、待付款方案額度、selected lesson count、remaining unavailable、期間unknown在三端一致且標籤不互換。
- Fee改價不改舊單；無快照不讀現價補值；缺資料不假填0或demo餘額。
- 390/768/1280中英、keyboard、long content、footer/scroll、返回及慢回覆等Root實際GUI驗收。
- repo/DB不因本片UI review/editor而寫入；最終業務保存、balance ledger及組合排扣補仍留Phase B。
