# SchoolTracs Courses / Fees 研究紀錄

研究日期：2026-10-14（香港時間）。Research Agent 僅使用使用者已登入的 Chrome 分頁，經畫面、可見欄位、選單及操作結果查證。沒有讀取或假定原系統內部程式／資料庫設計。

## 範圍與資料改動

- 研究範圍：Courses 列表、Create course、課程 General / Materials、Edit course、Add schedule 表單、課程內 Add fee、Fees 列表與 Create fee。
- 首輪只讀／未儲存操作；後續依統籌 Agent 的受控測試授權，建立一個合成課程及兩個收費，並測試重複課程名稱。
- 沒有修改原有 Q / C，沒有刪除、上傳、學生資料、付款、寄信或帳戶設定操作。
- 此紀錄區分「已觀察」、「已儲存並重新載入驗證」與「未確認」。不可將只看過表單當作完整功能通過。

## 原系統來源

帳戶查詢參數 `o=yausiuhei07`、分校 `b=2` 為本次畫面所示，不應寫死到 Beamal 系統。

| 畫面 | 查證 URL |
|---|---|
| Courses 列表 | https://web.schooltracs.com/v4/web/courses?b=2&o=yausiuhei07 |
| 原有課程 Q | https://web.schooltracs.com/v4/web/courses/1?b=2&o=yausiuhei07 |
| Q Materials | https://web.schooltracs.com/v4/web/courses/1?b=2&o=yausiuhei07&tab=materials |
| Fees 列表 | https://web.schooltracs.com/v4/web/fees?b=2&o=yausiuhei07 |
| Create fee（由按鈕開啟） | https://web.schooltracs.com/v4/web/fees?b=2&f=new&o=yausiuhei07&viewDialog=true |
| 合成課程 | https://web.schooltracs.com/v4/web/courses/2?b=2&o=yausiuhei07 |

## Courses 列表（已觀察）

- 頂部 Export、Import、Create。
- 狀態選單 Normal / Deleted；搜尋提示 Search course name；Category、Level 篩選。
- 表格：選取 checkbox、Name、Category、Level、Follows term、Fees、Online Store、Meeting link、View in Timetable。
- Name / Category / Level / Follows term 表頭有排序按鈕。排序方向與多欄排序尚未測試。
- 點課程名稱進入課程詳情；費用是獨立 Fees 深層連結，可同一課程顯示多個 Fee。
- Online Store 未啟用顯示 INACTIVE。
- 已有排課的 Q 可 View in Timetable；新建尚無排課的合成課程顯示 Add course schedule first，不能直接從該入口進入課程時間表。
- Export / Import 的檔案格式及流程未測試；Deleted 的還原流程未測試。

## Create course（已觀察 + 部分儲存驗證）

表單有固定標題／底部 Cancel、Create，內容獨立捲動。

| 區域 | 欄位及行為 |
|---|---|
| Course overview | Course name 必填可搜尋選項；Category、Level 可選，不必填 |
| Pricing | Fee name 必填可搜尋選項；三種互斥 Pricing model |
| Booking expiry | 預設關閉；關閉時 Valid for、Unit 禁用；開啟後可輸入／選擇期限 |
| Online Store | Display in Online Store 預設關閉；開啟沒有新增其他 Create-course 欄位 |

### 名稱輸入的重要行為

- 輸入新 Course name / Fee name 後，選單出現 `Add <輸入名稱>`；須選定這個選項。只輸入再按 Tab，本次觀察會清空尚未確認的文字。
- 選既有 Course name（Q 或合成課程）後，Fee name 會自動填為該課程名稱；Category、Level 仍可編輯。
- 已加入的 Fee 選項顯示 `(Added)` 並禁用（原有 C 的情況）。
- **Create course 選擇既有課程後提交，拒絕重複名稱，不是替既有課程加 Fee。** 本次實際警告：`Course ' > Beamal QA 20261014 > ' is already exists.`；沒有新增第二課程或部分 Fee。
- 空白提交被瀏覽器必填檢查擋住，Course name / Fee name 的 validation message 是 `Please fill in this field.`，視窗保留。
- 名稱不分大小寫、前後空白、Unicode、重複 Fee 名稱等規則未測試。

### 三種 Pricing model

| 模式 | 顯示欄位 | 已觀察選項／預設 |
|---|---|---|
| Monthly fee according to number of lessons in a month | Price per lesson、Duration per lesson (minutes)、No. of months | Create-course 預設選此模式；月份 1–24，預設 1 |
| Fixed monthly fee, no matter how many lessons in a month | Fixed monthly price、No. of months | 月份 1–24，預設 1 |
| Package with fixed number of lessons | Package price、Type、quota | Type=Minutes / Visits；Minutes 時 Minutes in total，Visits 時 No. of visits |

- 畫面說明（使用者提供的截圖，尚未經訂單驗證）：按課節月費以每節價格乘當月課節；固定月費不受當月課節數改變；套票在跨月期間使用固定配額。
- 價格／quota 數字 input 的可見 DOM 沒有 min/max/required 屬性；這**不代表系統接受任何值**。負數、0、小數、空值、極端值的應用／伺服器檢查未測試。
- 月份選單完整 1–24 已讀取；截圖選單可捲動，並非單張截圖全部選項同時可見。

### Booking expiry

- 說明：When enabled, students cannot add additional lessons into the order after the expiry date.
- Unit：Days / months；Valid for 提供 Days 1–365、months 1–12 選項，且是可輸入的 combobox。
- 月份 input DOM min=1、max=12；日數超出365是否接受、到期日期採月末調整／時區／閏日等邊界未測試。
- 此功能限制「到期後再把額外課節加入訂單」；不可自行推定為已存在課節自動刪除、已報名課節取消或出席被禁止。

## 課程詳情（已觀察）

### 頂部

- Go back、View in、Edit；分頁 General / Materials。
- View in 選單 Timetable；Online Store 在本次帳戶未啟用時禁用。
- Edit course 只含 Course name、Category (optional)、Level (optional)，底部 Delete / Save。本次開啟並關閉，沒有儲存修改。

### General / Schedule

- 有排課時有月份選擇／前後月份、Schedule Add、課堂群組展開及 Edit。
- 表頭 Date、Weekday、Start time、End time、Teachers、Rooms、Capacity、Students、More info、Details、Remark。
- 原有 Q 顯示 recurring group Thursday 10:00–10:45，期間 2026-10-08 至 2026-10-29。
- 無排課時顯示 No schedule yet、Add schedule，以及提示「To create 1:1 lessons, please visit the Sales page.」。Sales 連結帶 courseId。

Add schedule 表單（只開啟，未 Add）：

- 課程已選定且禁用，色彩選擇；顯示收費摘要。
- Start date 必填，預設當日2026-10-14；End 必填，預設 Repeat Forever；Start time 必填；Duration (min) 必填。
- 週期描述依開始日期產生，本次為每周三；有 Preview。
- Teacher、Room、Capacity、Session（預設1）、Remark、Detail、More info (shown in student app)。
- 尚未展開 End 的選項、時間／時長選項、Preview、重複排課衝突／假日／容量等規則；這些屬下一輪課程排課驗收。

### General / Fees

- 獨立 Fees 表格：Name、Fee、Applied to、Display in Online Store；Add，以及每行一個移除圖示。
- 已確認同一課程可有多個獨立 Fee：兩個已儲存 Fee 重新載入後仍在同一課程。
- 課程內 Add new fee：Fee name 可選／新建，Category (optional) 是 Fee 自己的分類；三種收費／Expiry 與獨立 Fee 建立接近。
- 下方 Courses 區固定為目前課程，Course name / Category / Level 均禁用；預設 Fee name 等於課程名稱。
- Add Fee 儲存中時 Add / Cancel 禁用並有 progress indicator；成功後關閉視窗並加入 Fee 表。
- Display in Online Store 開關及移除圖示的保存時機／還原機制尚未測試，避免只讀研究改動資料。

### General / Settings

- Display in Online Store 可展開（本次未展開），Set up 連結到 Channels / store-settings。
- 可見 Teacher、Lesson duration (minutes) 內容標籤。
- Add video conferencing link 可展開、Set up 到 Settings / integration。
- 本次未修改時 Save / Cancel 禁用。沒有操作帳戶／整合設定。

### Materials

- 表格 Name、Description、Owner、Uploaded on；初始 No material yet；Add。
- Add material：Name 必填、Description、Share with lesson 多選（本次列出未來三個 Q 課節）、Video link (e.g. Vimeo) 及新增多連結按鈕。
- 支援顯示的附件格式 PNG/JPG/GIF/MP4/AVI/MOV/MP3/WAV/M4A/PDF，max50MB；Choose files / drag and drop。
- Visible to students 預設關閉；Enable student download 禁用，直到 Visible 開啟後可操作。
- 沒有上傳或儲存，檔案驗證／學生可見權限／下載安全未驗證。

## Fees 獨立頁（已觀察）

- Export / Import / Create、Search、Normal status selection。
- 狀態選項：Normal / Multiple courses / Single course / Deleted。
- 表頭 Name、Category、Applied to、Courses、Price、Booking expiry；Courses 為回課程詳情的連結。
- 選取 checkbox 後顯示數量、Clear selection、Actions；Actions 有 Delete fees。未點刪除。
- 獨立 Create fee：Fee name (display on receipt) 必填 textbox、Fee Category(optional)、三種 Pricing model（初次開啟都未選中）、Expiry。
- Courses 區含 Course name / Category(optional) / Level(optional)，Add course 可追加多行；本次未儲存地追加到兩行，現有課程選項可選 Q，欄位未禁用。
- **多課程 Fee 建立入口已觀察，但一 Fee 實際跨兩個課程共用的保存及計價尚未測試。** 模型應預留多對多連結，不應因初始只有一行而限定一課程一收費。
- 既有 Fee 的深層連結／點名會將 URL 改為 `f=<id>&viewDialog=true`，但本次在 C/id1、新 Fixed Month/id3 均未顯示編輯視窗。重新載入仍是列表。此為觀察到的參考系統行為／可能異常，**不可宣稱編輯 Fee 表單已查證**。

## 已儲存並重新載入驗證的受控測試

| 項目 | 精確結果 |
|---|---|
| 新課程 | `Beamal QA 20261014`，course id `2` |
| 第一 Fee | `Beamal QA Per Lesson`，fee id `2`，price300，duration60minutes，month1，QUOTA_AND_MONTH 所對應畫面，expiry off / store off |
| 第二 Fee | `Beamal QA Fixed Month`，fee id `3`，price850，month1，fixed-month畫面，expiry off / store off |
| 第一建立入口 | Courses → Create → 新名稱 Add 選項 → Create，成功導向 /courses/2 |
| 重複名稱測試 | Courses → Create → 選既有合成課程＋Fixed Month，拒絕重複課程；沒有部分 Fee / duplicate course |
| 正確第二 Fee 入口 | /courses/2 → Fees Add → Add new fee；儲存成功 |
| reload / 跨頁 | /courses/2 reload 保留兩 Fee；Courses 列表一個合成課程行含兩 Fee links f2/f3；Fees 列表兩 Fee 各連同一course2 |
| 原有資料 | Q/course1、C/fee1 仍在；未修改 |

這三個新合成記錄仍留在 SchoolTracs，待使用者另行確認清理；本次沒有刪除。沒有建立課節、學生、訂單、付款或通知。

## 截圖證據

第一輪截圖已由統籌保存至此文件旁的 `evidence/` 目錄。以下為相對於本文件的持久證據路徑。

- `evidence/schooltracs-create-course-package.png`：Create course 套票Visits、Expiry開啟畫面。
- `evidence/schooltracs-course-months-24.png`：Create course月份1–24選單（需捲動）。
- `evidence/schooltracs-course-general.png`：Q General、Schedule和Fees。
- `evidence/schooltracs-course-add-fee.png`：Course內Add Fee、固定Course欄位。
- `evidence/schooltracs-create-fee-multiple-courses.png`：Standalone Create Fee多課程行。
- `evidence/schooltracs-material-dialog.png`：Materials表單與Visible/download依賴。
- `evidence/schooltracs-fees-list.png`：Fees列表。
- `evidence/schooltracs-add-schedule.png`：Course Add schedule表單。
- `evidence/schooltracs-qa-course-input.png`：合成課程第一Fee提交前。
- `evidence/schooltracs-qa-course-created.png`：課程id2建立成功。
- `evidence/schooltracs-qa-second-fee-input.png`：重複Createcourse被拒絕前的輸入。
- `evidence/schooltracs-qa-add-fixed-fee.png`：正確Add Fee路徑提交前。
- `evidence/schooltracs-qa-course-two-fees.png`：reload後同一課程兩Fee。
- `evidence/schooltracs-qa-course-edit-metadata.png`：Editcourse只基本屬性。

## Beamal 實作與驗收含義

1. 課程與 Fee 必須為獨立資料。已確認一課程多Fee；多課程Fee入口須保留，實際保存待後續合成測試。
2. Createcourse需原子建立課程與第一Fee：失敗時不得留下部分資料。既有課程要走Addfee，不可讓Create悄悄覆蓋／重建。
3. Course metadata、Fee category、Course category/level不可混為同一欄。
4. 已儲存記錄須在Course詳情／Courses／Fees各頁一致，刷新及另一登入裝置可讀到相同結果（原系統本次只驗證同瀏覽器reload，跨裝置未測）。
5. 可保留Beamal視覺與改善原系統反饋，但必須明確區分可輸入新值／需確認選項，避免原系統輸入+Tab丟失文字的操作陷阱。
6. 日期、套票扣quota、按月定價、Expiry追加課節限制，要用訂單／排課受控測試確認後才可宣稱完整重建。
7. 未通過項目：Fee編輯／刪除／還原、Import/Export、批量動作、Months>1計價、Minutes/Visits套票計價、Expiry日期邊界、原有訂單受Fee修改的影響、授權角色、Materials共享／下載、多課程Fee保存、Schedule完整週期與衝突檢查。

## 第二切片：Materials 可實作的最小規格

本節整理第一輪的直接觀察及持久截圖，**沒有新增 SchoolTracs 儲存結果**。第二輪開始時 Chrome 研究分頁未能重新取得：重新盤點返回空的瀏覽器清單，選擇已知 Chrome id3 顯示不可用。這是研究工具連線限制，沒有證據表明 SchoolTracs 本身無法使用。

### 已確認的畫面結構

來源：第一輪 `Materials → Add` 的可見表單、欄位狀態和多選列表，以及 `evidence/schooltracs-material-dialog.png`。

- Materials 是 Course 的第二個分頁，隸屬當前課程；建立入口位於該分頁。
- 空列表顯示 `No material yet`；列表欄位是 Name、Description、Owner、Uploaded on。
- Add material 視窗左側依次為 General information、Video links、Attachment，右側為 Settings；標題及底部 Cancel / Add 固定，表單內容可捲動。
- 未觀察到使用者可指定 Owner 或 Uploaded on 的欄位。這兩項應在 Beamal 保存時由登入者及保存時間產生，這是實作建議，不能當作原系統內部設計的證據。

### 欄位規格與驗收程度

| 欄位 | 已觀察的操作 | Beamal 建議資料／效果 | 還未證實的原系統規則 |
|---|---|---|---|
| Name | 普通文字輸入，顯示必填星號、input required | 單一名稱；空白提交要指出此欄錯誤並保留其餘輸入 | 長度、空白處理、重複名稱、Unicode、儲存後變更 |
| Description | 多行輸入，沒有必填星號 | 可選多行說明，列表顯示摘要、詳情可讀全文 | 長度、格式、是否支持富文字 |
| Share with lesson | combobox 多選，選項有 checkbox；第一輪 Q 列出2026-10-15/22/29的10:00–10:45課節 | 多個課節連結；保留課程識別與課節識別，避免只靠文字日期匹配 | 為何只列未來三節；沒有選課節時是整個課程共享還是沒有學生可見；跨課程是否支持；取消課節後結果 |
| Video links | 一個 Video link (e.g. Vimeo) 輸入及 Add 按鈕，介面表達可添加多條 | 可新增／移除連結的草稿列表；安全開啟／顯示預覽 | 哪些網址／平台接受、是否需HTTPS、空白／非法網址反饋、預覽、是否允許只有連結沒有附件 |
| Attachment | Choose files / 拖放區；列出PNG/JPG/GIF/MP4/AVI/MOV/MP3/WAV/M4A/PDF，max50MB | 最終須實作檔案選擇、傳輸進度、格式／大小檢查、保存及授權讀取 | 是否多檔、50MB是每檔還是總量、mime vs副檔名、失敗重試、刪除／替換附件、影片播放 |
| Visible to students | 預設off；切on後Enable student download變為可操作 | 保存開關；學生端讀取依該狀態及報名／課節權限；管理員老師仍可管理 | 學生可見範圍、何時更新、關閉後已開啟頁面／附件連結能否繼續讀取 |
| Enable student download | 預設off；Visible off時禁用，Visible on時可操作 | 只在Visible開啟時允許設定；在伺服器檢查，避免隱藏UI仍可直接下載 | Visible由on轉off是否自動清除download值；禁止下載是否仍允許播放／預覽；已生成連結有效性 |

表格第三欄是 Beamal 製作建議；第二欄才是本次參考系統已查證的事實。所有尚未確認的規則都要留在驗收清單，不能以「表單完成」勾掉整個 Materials 功能。

### 最小資料依賴（製作建議）

1. 使用已存在的 Course ID、登入使用者及角色資料，支持新增／讀取教材和Owner／時間記錄。新增失敗不得留下空教材或孤立檔案。
2. 可先完成 Name、Description、Visible／download 草稿依賴、Video links 草稿和Add／Cancel，再使用共用資料保存教材；這是一個功能切片，完整Goal仍包括附件、分享、編輯、刪除及學生端效果。
3. Share with lesson 需要已存在的具體 Lesson ID。尚未實作課節時可以標示尚無課節可選，不能編造原系統課節或將選擇默默忽略。
4. 附件需要獨立安全儲存及存取權限；只把檔名放進資料或把本機圖片嵌入頁面，不足以證明教材已共享給別的裝置。
5. 閱讀權限須同時檢查角色、學生報名／課節關係及可見設定；不得以瀏覽器中的開關或隱藏按鈕作唯一權限檢查。

### 本切片的可驗收流程（Beamal）

- 開啟Add，Name空白提交得到定位清楚的錯誤，Description／Video／開關仍保留。
- 只修改草稿再Cancel，列表及儲存資料沒有新增／變更；重新開啟是規定的初始狀態。
- 新增合成教材後列表顯示正確Name／Description／Owner／Uploaded on；刷新、另一個管理員登入仍讀到同一記錄。
- Visible off時學生沒有此教材；Visible on並有權限的學生可讀取；沒有權限的學生不可藉直接ID／檔案網址讀取。
- 傳輸中防止重複提交，失敗可修正／重試且不丟草稿；名稱或資料編輯有版本檢查，避免第二人覆蓋第一人最新修改。
- download關閉時應按最終查證規格限制；未查證前必須把限制行為明確標成產品決定／待驗收，不能聲称已複製原系統效果。
- 桌面與手機都能看完整表單、完成新增／Cancel；鍵盤焦點、錯誤提示、長文字及多連結列表仍可操作。

### 仍需原系統補查的下一輪清單

| 小切片 | 下一次只讀研究操作 | 必須另行驗證的保存效果 |
|---|---|---|
| General Settings | 展開Display in Online Store及meeting section；記錄實際欄位、必填、關閉／取消效果；查找Follows term入口 | 保存時机、渠道未設定時限制、meeting link是否每課堂生成、老師／時長依賴 |
| Materials | 重新開啟Add、檢查取消；試非提交video草稿、Share多選、Visible on→off的download狀態；若有既有教材只開Edit | 合成教材新增／改／刪／還原、授權可見／下載、跨裝置、檔案安全及故障恢復 |
| Course filters / Actions | Name搜尋、Category／Level組合、Normal／Deleted、全選／Clear selection；只打開Actions選單 | 刪除及還原、已存在課節／Fee／訂單如何處理、批量失敗是否部分成功 |
| Fee filters / Actions | Normal／Single course／Multiple courses／Deleted、Name搜尋及Clear selection；重新確認編輯入口異常 | 多課程fee建立、Fee修改影響歷史訂單、Fee刪除／還原、區分解除連結Fee與刪除Fee |

**建議下一個製作依賴：先做教材純資料表單和共用保存／權限切片，再接具體Lesson分享及附件。** General Settings實際欄位仍缺證據，應先保持未完成狀態並等待Chrome參考連線，不用猜測補上Follows term或booking欄位位置。這不表示跳到下一個模組；Courses／Fees整頁仍未通過。

## 第三切片：Materials 附件及草稿狀態補查（2026-10-14）

本段依統籌 Agent 的本輪 Chrome 直接操作回報及持久截圖補記；整理此段的 Agent 沒有再次控制瀏覽器。本輪只觀察可見介面、讀取表單 DOM 屬性及操作可取消草稿，**沒有選取檔案、上載附件或保存 SchoolTracs 改動**。

### 參考連線及進入路徑

- Chrome 瀏覽器盤點已恢復。既有分頁 `846615829` 由另一操作工作持有，本輪沒有搶佔控制。
- 統籌使用自己新開的分頁 `846615839`，進入既有課程 URL：`https://web.schooltracs.com/v4/web/courses/1?b=2&o=yausiuhei07&tab=materials`。
- 初次畫面先呈現 General；透過鍵盤切換至 Materials 成功。Materials 顯示 `No material yet`，再按 Add 開啟 Add material。
- 前一切片記錄的「工具無法重新取得 Chrome」是當時連線結果；本輪恢復並不補足附件保存、學生端或下載行為的證據。

### 附件：本輪已確認的介面規格

| 項目 | 本輪確切觀察 | 證據限制 |
|---|---|---|
| 可見格式提示 | PNG、JPG、GIF、MP4、AVI、MOV、MP3、WAV、M4A、PDF | 只是畫面提示，未測實際格式驗證或檔案內容檢查 |
| 大小提示 | `max50MB` | 未證實是每檔限制或總量；未測超限、空檔案或失敗反饋 |
| 檔案輸入 | DOM 的 `input[type=file]` 設有 `multiple=true` | 已確認允許多檔選擇的輸入屬性，沒有開啟檔案選擇視窗或選檔 |
| `accept` 屬性 | `image/gif,image/jpeg,image/png,application/pdf,video/mp4,video/avi,video/quicktime,audio/mpeg,audio/wav,audio/x-m4a` | 屬性限制不等於伺服器驗證；未證實副檔名與實際內容不符時如何處理 |

因此仍不能確認：選檔是否立即上載、是否有逐檔進度／重試、拖放的實際結果、保存時機、附件預覽／播放、下載、移除／替換及取消時暫存清理。列表沒有既有教材，本輪也沒有利用原有私人檔案補測。

### Visible／Download：草稿依賴及取消已實測

| 操作順序 | Visible to students | Enable student download |
|---|---|---|
| 新開 Add material | 關閉 | 未勾選、禁用 |
| 開啟 Visible | 開啟 | 可操作 |
| 開啟 Download | 開啟 | 已勾選、可操作 |
| 再關閉 Visible | 關閉 | **仍然已勾選，但禁用** |
| 再開啟 Visible | 開啟 | **仍然已勾選，恢復可操作** |
| Cancel 回清單，再重新 Add | 關閉 | 未勾選、禁用 |

- Cancel 後清單仍是 `No material yet`；重新開啟是初始開關狀態，沒有新增教材。
- 本輪持久畫面：[Visible 關閉而 Download 保留勾選的草稿](evidence/schooltracs-material-download-draft-20261014.png)。此圖已由統籌保存；本段整理時確認檔案存在並檢視畫面。
- **更正先前 Beamal 的草稿產品決定：**「Visible 關閉時即清除 Download 勾選」不符合本輪原系統草稿觀察。Beamal 本輪將草稿改為只禁用 Download，保留其勾選，重新開啟 Visible 可恢復操作。
- Beamal 服務在保存隱藏教材時仍將 `studentDownload` 正規化為 false，這是既有權限政策。**原系統在 Visible 關閉而 Download 草稿仍勾選時，保存後會保留或清除甚麼值仍未知。**不能以本輪草稿觀察證明其保存、預覽或下載權限。

### Share with lesson：選項已確認，選擇效果未通過

- 使用 ArrowDown 展開 Share with lesson，確認 checkbox 列表包含三節：`2026-10-15`、`2026-10-22`、`2026-10-29`，時間均為 `10:00–10:45`。
- 嘗試以 Space 選 checkbox 後，選單收起，但沒有出現已選課節標籤；**未證實選擇成功**，不能宣稱本輪完成單選或多選操作。
- 在收起的 combobox 使用 Enter 曾觸發 Name 必填驗證；沒有任何保存。這不構成 Share 已保存或已套用的證據。
- 未選課節時的分享範圍、多課節保存、學生報名／課節關聯、課節取消後的結果及跨課程分享仍待查證。

### 下一步附件切片的查證及驗收邊界

1. 先查明 Choose files 是先建草稿還是即時傳輸；未取得可控上載授權前，不以實際選檔補猜上載流程。
2. 原系統未能確認的規則須明確標成 Beamal 產品決定：50MB 按每檔或總量、格式與內容驗證、逐檔失敗處理、預覽與下載的權限差異、取消／失敗暫存清理，以及無 Share 選擇時的教材範圍。
3. Beamal 附件驗收須包含：錯誤保留其他草稿、傳輸中取消不留下半筆教材、回覆遺失重試不重複附件、版本衝突不覆蓋別人的新檔案、登入過期隔離私人預覽與晚到結果、直接檔案網址的授權檢查及手機操作。
4. 本輪沒有證明任何附件上載／預覽／下載／移除效果；教材整頁及完整 Goal 仍未完成。後續 UI、服務及獨立 QA 繼續附件切片，不把多檔輸入屬性或草稿開關視為完整功能。
