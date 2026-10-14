# SchoolTracs Timetable 研究紀錄

研究日期：2026-10-14（香港時間）。依使用者最新澄清，先一起處理 **課程＋時間表的關聯主流程 → 產品 → 學生 → 會計 → 報告 → 員工**，不是把課程與時間表拆成兩套資料。

## 來源與證據邊界

- 統籌 Agent 在使用者提供的 Chrome 分頁 `846615854` 直接操作，由 Guided Setup 進入 Timetable。本檔由 Research Agent 整理統籌的操作回報，另已親自檢視下方保存的截圖；Research Agent 沒有接管瀏覽器。
- 本輪只開啟畫面、切換草稿設定、查看 Preview 及取消，**沒有在原系統按 Add／Save 建立或修改排課**。
- Cancel 已實際返回 Timetable，URL 移除 `aa=new`；原有 Q 沒有改動。
- Beamal 現有畫面、程式碼測試與正在實作的共用排課，不等同 SchoolTracs 已實測的保存行為。下列「原系統已確認」只限本輪明確操作結果。
- 本輪不再延伸教材／PDF。既有相關證據保留，未完成項目仍見 [DEFERRED.md](DEFERRED.md)。

## 時間表主畫面

| 項目 | 原系統已確認 | 尚未確認 |
| --- | --- | --- |
| 預設檢視 | Week | 其他檢視的實際排版、導覽與篩選效果 |
| 檢視選單 | 已展開，明確列出 Day、Week（選定）、Month、List | 尚未逐一切換驗證 |
| 時間格 | 本次可見 09:00–19:45，每格 15 分鐘 | 更早／更晚排課如何顯示；可見時間格不是業務允許時段的界限證據 |
| 日期及搜尋 | 看見日期、搜尋與日期導覽控制 | 搜尋配對規則、資源篩選、多欄條件及日期邊界尚未逐項操作 |
| Add schedule | 已開啟表單及 End 設定 | 真正 Add、保存後列表、重新開啟、修改與刪除結果 |
| Print | 有獨立輸出連結，帶 `hideBar=print` | 未查看輸出／列印結果；已列 minor 延後 |

## Add schedule 草稿

本輪從 Timetable 進入；課程仍留空。表單欄位與 Beamal 現有 Schedule 編輯器所涵蓋的欄位一致，既有 Courses／Fees 研究另記錄了從課程詳情進入時的情況，見 [既有研究](research-courses-fees.md)。

| 區域 | 已觀察欄位／狀態 |
| --- | --- |
| Course overview | Course 必填選單、Colour；本輪沒有選定課程 |
| Schedule | Start date、End、Start time、Duration (min)、重複敘述及 Preview |
| 起始日期 | 本輪為 `2026-10-14` |
| Additional information (optional) | Teacher、Room、Capacity、Session、Remark、Detail、More info；沒有保存任何輸入 |
| 退出 | Cancel 回時間表，未新增排課 |

本輪沒有確認 Teacher／Room 的完整選項、容量及課節數的服務端限制、時間選項完整範圍、收費計算或報名效果。

## End：重複規則及 Preview

### 已操作的設定

- 可選星期一至星期日，可同時選多個星期。
- 出席選項預設 Yes：需出席所有選定星期；No：可按選定日子報讀。這是畫面選項的意思，**尚未透過學生報名驗證**。
- 結束方式預設 Never Ends；另有 Ends on（日期）及 Ends after（課節次數）。
- 初始次數為 1；在 **Mon + Wed、Yes** 這個已觀察組合下，次數下限變成 2。未確認 No、其他星期組合或原服務的最大值，不把此個案推成完整通用規則。
- 設定次數 4，Preview 月曆在 2026 年 10 月實際標示 **14、19、21、26 日**，即 10 月 14 日開始後的四個星期三／星期一課節。
- 此證據確認草稿預覽日期，不代表已生成四筆服務資料、已建立訂單或已報名學生。

### 持久畫面

[原系統重複排課預覽截圖](evidence/schooltracs-timetable-repeat-preview.png)

截圖可見 Course 空白、Start date `2026-10-14`、End `4 lessons`、Week 檢視，以及 Preview 高亮 14、19、21、26 日。End 對話框選項及取消返回結果來自統籌直接操作回報，不假稱全部同時出現在這張圖中。

## Beamal 對齊及主要流程驗收清單

「來源確認」與「Beamal 通過」分開記錄。此研究檔不替正在進行的程式修改、HTTP 測試或瀏覽器驗收下結論。

| 主流程 | 原系統來源狀態 | Beamal 本輪應驗證的效果 | 本檔中的 Beamal 狀態 |
| --- | --- | --- | --- |
| 課程與時間表共用關聯 | Add schedule 的 Course 欄位確認；課程詳情的 Schedule 另見既有研究 | 排課使用指向既有共用課程的外鍵（排課必須連到已存在的課程）；課程詳情 Schedule 與 Timetable 讀取同一套排課回覆，新增／修改後兩邊一致 | 課程資料及 Fees 的既有真實服務已建立；同一排課資料的關聯讀取正在接線，本輪整體效果待驗 |
| 開啟與切換時間表 | Week 預設及四個檢視選項確認 | 日／週／月／列表可查詢同一套排課，保留中英文與手機版 | 現有 UI 可重用；本輪整合待驗 |
| 新增排課 | 表單與未保存草稿確認 | 使用共用課程 ID 建立，收到服務確認後才關表單；新分頁及服務重新啟動後仍可讀到 | 共用服務及接線正在實作，未標為通過 |
| 重複星期與結束方式 | Mon + Wed、Yes、4 次的預覽日期確認 | 對應日期為 `2026-10-14/19/21/26`；日期、課節次數與起始日一致 | 待本輪核心規則測試及畫面核對 |
| 出席選項／次數下限 | Yes 預設；Mon + Wed、Yes 下限 2 | UI 對齊已觀察個案，不把未研究的 No 規則當作來源事實 | 統籌已決定本輪調整 UI；完成效果待驗 |
| 修改 | 原系統實際保存未測 | 修改同一排課、保留 ID；舊版本不能覆蓋新版本 | 待共用服務及衝突測試 |
| 刪除／復原 | 原系統實際操作未測 | 主要刪除行為與既有關聯資料保持一致；若提供復原，須獨立驗證 | 不列 minor；本輪實作範圍及結果另記 |
| 取消 | 已回時間表，未新增排課 | 取消不寫共用資料、不留下排課；草稿與畫面狀態有清楚結果 | 待 Beamal 本輪回歸 |
| 帳戶與資料隔離 | 原系統跨帳戶行為未測 | 服務判斷真實角色；身份切換清空排課快取／草稿，舊回覆不能重填 | 必要核心驗收，不可略過 |
| 老師／課室、學生與數字 | 表單欄位確認，關聯效果未測 | 不把本機示範老師、課室、報名或付款數字當成共用真實資料 | 需隨 Staff／Students 等主要頁面接續對齊 |

Beamal 後端目前採用的課節次數 `1–999` 是本專案的驗證界限，**沒有原系統最大值的查證支持**。UI 針對上述 Yes／多星期個案的對齊，也不構成原系統所有條件組合的完整規格。

## 明確延後的次要項目

Print 的獨立輸出入口按使用者「複雜次要功能先略過」指示延後，記錄於 [DEFERRED.md](DEFERRED.md)。原服務 Subscribe、Book a Demo、Help 等已有同檔記錄，不另建立重複待辦。

課程與時間表的共用關聯、真正共用保存、角色及身份隔離、主要新增／修改／刪除、重複日期正確、學生／課程關係與會計數字，仍屬指定主流程；不能因本輪只看過草稿而標為完成或 minor。

## 同日後續：單堂／往後課堂已保存研究

本節是 2026-10-14 較後進行的真實保存研究。**上方「沒有 Add／Save」及驗收表中的「原系統保存未測」，是較早草稿研究當時的狀態，不是本節完成後對整日研究的結論。** 保留早期紀錄，不將後續取得的證據倒寫成早已驗證。

### 來源及受控資料

- 統籌直接操作同一 SchoolTracs 參考網站；Research Agent 整理其回報，並親自檢視下列範圍選項、移日後只改時間及最後改日期的三張關鍵截圖。Research Agent 本輪沒有操作瀏覽器。
- 原有 Q 沒有改動。本次使用先前已建立的合成課程 `Beamal QA 20261014`，新增 **2026-10-14／21／28** 三堂，每星期三，12:30–13:00，Capacity 5，Remark 為 `Fictional scope QA20261014-no students`，沒有學生。
- 初始以 Ends after 3 建立。以下每項均依序承接上一步保存後的結果，不是各自從初始資料獨立重做。
- 本輪沒有按 Delete／Restore，沒有學生報名、付款或通知操作。來源原有費用仍為 $300／$850；本節不把排課修改當作重新計價證據。

### 保存次序與實際結果

下表時間為各堂開始時間；除第一步列明初始 30 分鐘時長外，不由未展示欄位推算其他規則。

| 步驟 | 實際操作 | 保存後／重新開啟的明確結果 |
| --- | --- | --- |
| 建立基準 | 新增 14／21／28 日三堂 | 三堂均為 12:30–13:00，Capacity 5，沒有學生 |
| 開啟第二堂 | 從 21 日那一列進 Edit | Start date 21 日、End 28 日、Session 2；雖以次數建立，Edit 顯示最後日期，不是預填剩餘兩堂的次數模式 |
| 第一次 Save | 將 21 日開始時間改為 12:45，按 Save | 出現 Apply changes to，只有 This lesson only／This and following lessons 兩個 radio；初始未選，OK 禁用 |
| 單堂時間 | 選 This lesson only 並確認 | 14／28 日仍為 12:30；只有 21 日變為 12:45 |
| 往後時間 | 再開 21 日，開始時間改為 13:00，選 This and following lessons | 14 日仍為 12:30；21／28 日均變為 13:00 |
| 單堂移日 | 把 21 日移到 22 日，選 This lesson only | 日期為 14／22／28；22 日為星期四。重新開啟 22 日 Edit，Start 22 日、End 仍為 28 日、Session 2，敘述為星期四、22 日至 28 日 |
| 移日後只改時間 | 在 22 日 Edit 只把時間改為 13:15，選 This and following lessons；沒有相對預填值改日期／重複設定 | **14 日仍 12:30，22／28 日均為 13:15；28 日仍是星期三，沒有多生 29 日** |
| 明確改開始日期 | 再開 22 日 Edit，把 Start 改成 23 日；畫面自動顯示星期五，End 28 日不變；Save 選 This and following lessons | 列表剩下 **14 日 12:30／23 日 13:15**；28 日不再出現，沒有 29 日 |

### 這組結果確認了甚麼

1. 從某一列進入 Edit，表單帶出該堂的日期及課節號，Save 後再詢問「只限這堂／這堂及往後」。不能再把此入口當作無條件修改整套排課。
2. 本例以三次建立的有限系列，Edit 預填最後日期 28 日。不能為了維持剩餘次數，自動把 End 延至 29 日或改成剩餘兩次。
3. **表單預填的星期四／22–28 日，不代表只改時間就要重新生成所有往後日期。** 移日後只改時間，22 日與原有星期三的 28 日均保留；實作須辨認使用者相對打開表單時實際改了哪些欄位。
4. 明確把 Start 改為 23 日時，這個測例的後段日期才按新星期五及不變的 End 28 日重排，因此只剩 23 日一堂；不能以「保留堂數」擅自加出 End 之後的日期。
5. 這些是本例的畫面及保存結果；沒有讀取 SchoolTracs 內部資料格式，也沒有確認它使用固定序號、日期例外或其他儲存結構。

### 本輪持久證據

| 檔案 | 對應證據 |
| --- | --- |
| [schooltracs-scope-three-lessons.png](evidence/schooltracs-scope-three-lessons.png) | 初始三堂及時間 |
| [schooltracs-scope-options.png](evidence/schooltracs-scope-options.png) | Save 後的兩個範圍選項，初始未選、OK 禁用；Research Agent 已親自檢視 |
| [schooltracs-scope-only-result.png](evidence/schooltracs-scope-only-result.png) | 單堂時間修改結果 |
| [schooltracs-scope-following-result.png](evidence/schooltracs-scope-following-result.png) | 往後時間修改結果 |
| [schooltracs-scope-moved-result.png](evidence/schooltracs-scope-moved-result.png) | 單堂移至 22 日後的列表 |
| [schooltracs-scope-moved-following-time.png](evidence/schooltracs-scope-moved-following-time.png) | 只改往後時間仍保留 14／22／28，28 日仍星期三；Research Agent 已親自檢視 |
| [schooltracs-scope-following-date-result.png](evidence/schooltracs-scope-following-date-result.png) | 明確改 Start 後列表只剩 14／23；Research Agent 已親自檢視 |

### 保留的未確認事項

- 只限本課程、2026 年 10 月、每星期三三堂、上述日期及時間變更；不推廣為所有多星期組合、無限排課、假日、跨月／時區或移日先後順序的完整規則。
- 沒有測試有學生、訂單、付款、出席或教材分享時，改日期／時間對關聯資料的影響。
- 單堂／往後課堂刪除、取消及還原仍未在原系統操作；Beamal 為此提供的保護及還原安排不能標為原系統已驗證規則。
- 本節更新的是參考來源證據，不把 Beamal 的服務、整合測試、手機畫面或整頁驗收自動標為通過；該切片的驗收界限另見 [範圍修改檢查點](schedule-scope-checkpoint.md)。
