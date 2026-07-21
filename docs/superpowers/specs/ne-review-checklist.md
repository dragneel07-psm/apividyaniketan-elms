# Nepali (नेपाली) Translation Review Checklist

> **Auto-generated** by `frontend/scripts/gen-ne-review-checklist.mjs`. Do not edit by hand — re-run the generator after changing locale files.

Every Nepali value below was AI-drafted and needs a native-speaker check. Review each row against its English source, then tick the box. Flag awkward, incorrect, or context-wrong translations and fix them in `frontend/locales/ne.json`.

- **Total keys to review:** 1103
- **Namespaces:** 49
- **Source of truth:** `frontend/locales/ne.json` (English reference: `frontend/locales/en.json`)

## Progress by namespace

| Namespace | Keys |
| --- | --- |
| `common` | 6 |
| `parent.attendance` | 20 |
| `parent.childDetail` | 39 |
| `parent.children` | 13 |
| `parent.dashboard` | 31 |
| `parent.fees` | 31 |
| `parent.grades` | 20 |
| `parent.leaves` | 49 |
| `parent.meetings` | 34 |
| `parent.messages` | 1 |
| `parent.nav` | 13 |
| `parent.notices` | 4 |
| `parent.projectDetail` | 8 |
| `parent.projects` | 14 |
| `student.achievements` | 7 |
| `student.aiTutor` | 19 |
| `student.assessmentResults` | 23 |
| `student.assessmentTake` | 22 |
| `student.assessments` | 20 |
| `student.assignmentDetail` | 31 |
| `student.assignments` | 30 |
| `student.attendance` | 25 |
| `student.classes` | 17 |
| `student.complaints` | 24 |
| `student.courses` | 82 |
| `student.dashboard` | 38 |
| `student.exams` | 23 |
| `student.fees` | 43 |
| `student.grades` | 24 |
| `student.leaderboard` | 14 |
| `student.learningPath` | 25 |
| `student.leaves` | 37 |
| `student.library` | 21 |
| `student.messages` | 18 |
| `student.myInfo` | 24 |
| `student.nav` | 36 |
| `student.notices` | 18 |
| `student.notifications` | 1 |
| `student.offline` | 29 |
| `student.paymentResult` | 5 |
| `student.profile` | 2 |
| `student.projectDetail` | 25 |
| `student.projectsList` | 9 |
| `student.quizDetail` | 23 |
| `student.quizzes` | 18 |
| `student.reports` | 35 |
| `student.resources` | 11 |
| `student.schedule` | 26 |
| `student.timetable` | 15 |

## `common`

| ✓ | Key | English | नेपाली |
| --- | --- | --- | --- |
| [ ] | `common.appName` | School LMS | विद्यालय एलएमएस |
| [ ] | `common.cancel` | Cancel | रद्द गर्नुहोस् |
| [ ] | `common.greeting` | Welcome, {name} | स्वागत छ, {name} |
| [ ] | `common.loading` | Loading... | लोड हुँदैछ... |
| [ ] | `common.save` | Save | सुरक्षित गर्नुहोस् |
| [ ] | `common.viewAll` | View All | सबै हेर्नुहोस् |

## `parent.attendance`

| ✓ | Key | English | नेपाली |
| --- | --- | --- | --- |
| [ ] | `parent.attendance.belowThreshold` | Below 75% threshold — please contact the school. | ७५% भन्दा कम — कृपया विद्यालयलाई सम्पर्क गर्नुहोस्। |
| [ ] | `parent.attendance.dayFri` | Fri | शुक्र |
| [ ] | `parent.attendance.dayMon` | Mon | सोम |
| [ ] | `parent.attendance.daySat` | Sat | शनि |
| [ ] | `parent.attendance.daySun` | Sun | आइत |
| [ ] | `parent.attendance.dayThu` | Thu | बिही |
| [ ] | `parent.attendance.dayTue` | Tue | मंगल |
| [ ] | `parent.attendance.dayWed` | Wed | बुध |
| [ ] | `parent.attendance.errorLoad` | Failed to load attendance. | उपस्थिति लोड गर्न असफल भयो। |
| [ ] | `parent.attendance.errorLoadProfile` | Failed to load parent profile. | अभिभावक प्रोफाइल लोड गर्न असफल भयो। |
| [ ] | `parent.attendance.monthlyRate` | Monthly Attendance Rate | मासिक उपस्थिति दर |
| [ ] | `parent.attendance.noChildren` | No children linked to your account. | तपाईंको खातामा कुनै बालबालिका जोडिएको छैन। |
| [ ] | `parent.attendance.pageTitle` | Attendance | उपस्थिति |
| [ ] | `parent.attendance.sectionLabel` | Parent Portal | अभिभावक पोर्टल |
| [ ] | `parent.attendance.statPct` | Attendance % | उपस्थिति % |
| [ ] | `parent.attendance.statusAbsent` | Absent | अनुपस्थित |
| [ ] | `parent.attendance.statusExcused` | Excused | माफ गरिएको |
| [ ] | `parent.attendance.statusLate` | Late | ढिलो |
| [ ] | `parent.attendance.statusPresent` | Present | उपस्थित |
| [ ] | `parent.attendance.subtitle` | Monthly attendance records for your children. | तपाईंका बालबालिकाको मासिक उपस्थिति रेकर्ड। |

## `parent.childDetail`

| ✓ | Key | English | नेपाली |
| --- | --- | --- | --- |
| [ ] | `parent.childDetail.back` | Back | पछाडि |
| [ ] | `parent.childDetail.btnNext` | Next → | अर्को → |
| [ ] | `parent.childDetail.btnPrev` | ← Prev | ← अघिल्लो |
| [ ] | `parent.childDetail.dueLabel` | Due: {date} | अन्तिम मिति: {date} |
| [ ] | `parent.childDetail.feeItems` | Fee Items | शुल्क विवरण |
| [ ] | `parent.childDetail.feeOutstanding` | Outstanding | बाँकी |
| [ ] | `parent.childDetail.feePaid` | Paid | भुक्तानी भयो |
| [ ] | `parent.childDetail.feeTotalDue` | Total Due | कुल बक्यौता |
| [ ] | `parent.childDetail.generalSubject` | General | सामान्य |
| [ ] | `parent.childDetail.monthsShort.0` | Jan | जनवरी |
| [ ] | `parent.childDetail.monthsShort.1` | Feb | फेब्रुअरी |
| [ ] | `parent.childDetail.monthsShort.10` | Nov | नोभेम्बर |
| [ ] | `parent.childDetail.monthsShort.11` | Dec | डिसेम्बर |
| [ ] | `parent.childDetail.monthsShort.2` | Mar | मार्च |
| [ ] | `parent.childDetail.monthsShort.3` | Apr | अप्रिल |
| [ ] | `parent.childDetail.monthsShort.4` | May | मे |
| [ ] | `parent.childDetail.monthsShort.5` | Jun | जुन |
| [ ] | `parent.childDetail.monthsShort.6` | Jul | जुलाई |
| [ ] | `parent.childDetail.monthsShort.7` | Aug | अगस्ट |
| [ ] | `parent.childDetail.monthsShort.8` | Sep | सेप्टेम्बर |
| [ ] | `parent.childDetail.monthsShort.9` | Oct | अक्टोबर |
| [ ] | `parent.childDetail.noAttendance` | No attendance records for this month. | यस महिनाको कुनै उपस्थिति रेकर्ड छैन। |
| [ ] | `parent.childDetail.noFees` | No fee records found. | कुनै शुल्क रेकर्ड भेटिएन। |
| [ ] | `parent.childDetail.noResults` | No results yet. | अहिलेसम्म कुनै नतिजा छैन। |
| [ ] | `parent.childDetail.paidDueLabel` | Paid / Due | भुक्तानी / बक्यौता |
| [ ] | `parent.childDetail.paymentHistory` | Payment History | भुक्तानी इतिहास |
| [ ] | `parent.childDetail.statAbsent` | Absent | अनुपस्थित |
| [ ] | `parent.childDetail.statLate` | Late | ढिलो |
| [ ] | `parent.childDetail.statPresent` | Present | उपस्थित |
| [ ] | `parent.childDetail.statRate` | Rate | दर |
| [ ] | `parent.childDetail.statusOverdue` | Overdue | म्याद नाघेको |
| [ ] | `parent.childDetail.statusPaid` | Paid | भुक्तानी भयो |
| [ ] | `parent.childDetail.statusPartial` | Partial | आंशिक |
| [ ] | `parent.childDetail.statusPending` | Pending | बाँकी |
| [ ] | `parent.childDetail.subtitle` | Full academic overview | पूर्ण शैक्षिक अवलोकन |
| [ ] | `parent.childDetail.tabAttendance` | Attendance | उपस्थिति |
| [ ] | `parent.childDetail.tabFees` | Fees | शुल्क |
| [ ] | `parent.childDetail.tabGrades` | Grades | ग्रेड |
| [ ] | `parent.childDetail.title` | Child Details | बालबालिकाको विवरण |

## `parent.children`

| ✓ | Key | English | नेपाली |
| --- | --- | --- | --- |
| [ ] | `parent.children.attendance` | Attendance | उपस्थिति |
| [ ] | `parent.children.btnLeave` | Leave | बिदा |
| [ ] | `parent.children.btnProfile` | Profile | प्रोफाइल |
| [ ] | `parent.children.childLinked` | {count} child linked to your account. | {count} बालबालिका तपाईंको खातामा जोडिएको छ। |
| [ ] | `parent.children.childrenLinked` | {count} children linked to your account. | {count} बालबालिका तपाईंको खातामा जोडिएका छन्। |
| [ ] | `parent.children.errorLoad` | Failed to load children. | बालबालिकाको डेटा लोड गर्न असफल भयो। |
| [ ] | `parent.children.noClass` | No Class | कक्षा छैन |
| [ ] | `parent.children.noStudentsLinked` | No students linked yet. Contact the school administration. | अहिलेसम्म कुनै विद्यार्थी जोडिएको छैन। विद्यालय प्रशासनसँग सम्पर्क गर्नुहोस्। |
| [ ] | `parent.children.pageTitle` | My Children | मेरा बालबालिका |
| [ ] | `parent.children.sectionLabel` | Parent Portal | अभिभावक पोर्टल |
| [ ] | `parent.children.statAttend` | Attend. | उपस्थि. |
| [ ] | `parent.children.statFocus` | Focus | फोकस |
| [ ] | `parent.children.statStreak` | Streak | लगातार |

## `parent.dashboard`

| ✓ | Key | English | नेपाली |
| --- | --- | --- | --- |
| [ ] | `parent.dashboard.attendanceLast30` | Attendance (Last 30 days) | उपस्थिति (पछिल्लो ३० दिन) |
| [ ] | `parent.dashboard.btnAiReport` | AI Report | एआई रिपोर्ट |
| [ ] | `parent.dashboard.btnDetails` | Details | विवरण |
| [ ] | `parent.dashboard.btnGenerating` | Generating... | तयार गर्दैछ... |
| [ ] | `parent.dashboard.childLinked` | {count} child linked to your account | {count} बालबालिका तपाईंको खातामा जोडिएको छ |
| [ ] | `parent.dashboard.childrenLinked` | {count} children linked to your account | {count} बालबालिका तपाईंको खातामा जोडिएका छन् |
| [ ] | `parent.dashboard.errorLoad` | Failed to load dashboard. | ड्यासबोर्ड लोड गर्न असफल भयो। |
| [ ] | `parent.dashboard.errorReport` | Failed to generate AI report. | एआई रिपोर्ट तयार गर्न असफल भयो। |
| [ ] | `parent.dashboard.noClass` | No Class | कक्षा छैन |
| [ ] | `parent.dashboard.noProfileDesc` | No parent profile is linked to your account. | तपाईंको खातामा कुनै अभिभावक प्रोफाइल जोडिएको छैन। |
| [ ] | `parent.dashboard.noProfileTitle` | No profile found | प्रोफाइल फेला परेन |
| [ ] | `parent.dashboard.noStudentsLinked` | No students linked yet. | अहिलेसम्म कुनै विद्यार्थी जोडिएको छैन। |
| [ ] | `parent.dashboard.quickAttendance` | Attendance | उपस्थिति |
| [ ] | `parent.dashboard.quickFees` | Fees | शुल्क |
| [ ] | `parent.dashboard.quickGrades` | Grades | ग्रेडहरू |
| [ ] | `parent.dashboard.quickMeetings` | Meetings | बैठकहरू |
| [ ] | `parent.dashboard.recentResults` | Recent Results | भर्खरका नतिजाहरू |
| [ ] | `parent.dashboard.reportAnalysing` | Analysing student data... | विद्यार्थी डेटा विश्लेषण गर्दैछ... |
| [ ] | `parent.dashboard.reportAreasForGrowth` | Areas for Growth | सुधार गर्नुपर्ने क्षेत्रहरू |
| [ ] | `parent.dashboard.reportDesc` | AI-generated analysis for {name} | {name} का लागि एआई-उत्पन्न विश्लेषण |
| [ ] | `parent.dashboard.reportRecommendations` | Recommendations | सिफारिसहरू |
| [ ] | `parent.dashboard.reportStrengths` | Strengths | बलियो पक्षहरू |
| [ ] | `parent.dashboard.reportSummary` | Executive Summary | कार्यकारी सारांश |
| [ ] | `parent.dashboard.reportTitle` | AI Progress Report | एआई प्रगति रिपोर्ट |
| [ ] | `parent.dashboard.requestMeeting` | Request Meeting | बैठक अनुरोध गर्नुहोस् |
| [ ] | `parent.dashboard.sectionLabel` | Parent Portal | अभिभावक पोर्टल |
| [ ] | `parent.dashboard.statAttendance` | Attendance | उपस्थिति |
| [ ] | `parent.dashboard.statFocus` | Focus | फोकस |
| [ ] | `parent.dashboard.statStreak` | Streak | लगातार |
| [ ] | `parent.dashboard.title` | Dashboard | ड्यासबोर्ड |
| [ ] | `parent.dashboard.upcoming` | Upcoming | आगामी |

## `parent.fees`

| ✓ | Key | English | नेपाली |
| --- | --- | --- | --- |
| [ ] | `parent.fees.amountPaid` | Amount Paid | भुक्तानी रकम |
| [ ] | `parent.fees.balanceDue` | Balance Due | बाँकी रकम |
| [ ] | `parent.fees.continue` | Continue | अगाडि बढ्नुहोस् |
| [ ] | `parent.fees.due` | Due | भुक्तानी मिति |
| [ ] | `parent.fees.errorLoad` | Failed to load fees. | शुल्क लोड गर्न असफल भयो। |
| [ ] | `parent.fees.errorLoadProfile` | Failed to load parent profile. | अभिभावक प्रोफाइल लोड गर्न असफल भयो। |
| [ ] | `parent.fees.errorPayment` | Payment initiation failed. Please try again. | भुक्तानी सुरु गर्न असफल भयो। कृपया फेरि प्रयास गर्नुहोस्। |
| [ ] | `parent.fees.feeStructureDesc` | Breakdown of fees for {name} | {name} को शुल्कको विवरण |
| [ ] | `parent.fees.feeStructureTitle` | Fee Structure | शुल्क संरचना |
| [ ] | `parent.fees.noChildren` | No children linked to your account. | तपाईंको खातामा कुनै बालबालिका जोडिएको छैन। |
| [ ] | `parent.fees.noFeeRecords` | No fee records available yet. | अहिलेसम्म कुनै शुल्क रेकर्ड उपलब्ध छैन। |
| [ ] | `parent.fees.overdueAlert` | {count} overdue fee — please clear your dues to avoid service interruption. | {count} शुल्क म्याद नाघ्यो — सेवा अवरोध नहोस् भनी बाँकी चुक्ता गर्नुहोस्। |
| [ ] | `parent.fees.overdueAlert_plural` | {count} overdue fees — please clear your dues to avoid service interruption. | {count} शुल्कहरू म्याद नाघे — सेवा अवरोध नहोस् भनी बाँकी चुक्ता गर्नुहोस्। |
| [ ] | `parent.fees.pageTitle` | Fees & Payments | शुल्क र भुक्तानी |
| [ ] | `parent.fees.paidPct` | {pct}% paid | {pct}% भुक्तानी |
| [ ] | `parent.fees.pay` | Pay | तिर्नुहोस् |
| [ ] | `parent.fees.payOnlineTitle` | Pay Online | अनलाइन तिर्नुहोस् |
| [ ] | `parent.fees.paymentFallback` | Payment | भुक्तानी |
| [ ] | `parent.fees.paymentHistory` | Payment History | भुक्तानी इतिहास |
| [ ] | `parent.fees.paymentProgress` | Payment Progress | भुक्तानी प्रगति |
| [ ] | `parent.fees.receipt` | Receipt | रसिद |
| [ ] | `parent.fees.redirectNotice` | You will be redirected to complete payment. | भुक्तानी पूरा गर्न पुनःनिर्देशित गरिनेछ। |
| [ ] | `parent.fees.redirecting` | Redirecting... | पुनःनिर्देशित हुँदैछ... |
| [ ] | `parent.fees.sectionLabel` | Parent Portal | अभिभावक पोर्टल |
| [ ] | `parent.fees.selectMethod` | Select a payment method to pay | भुक्तानी माध्यम छान्नुहोस् |
| [ ] | `parent.fees.statusOverdue` | Overdue | म्याद नाघेको |
| [ ] | `parent.fees.statusPaid` | Paid | भुक्तानी भयो |
| [ ] | `parent.fees.statusPartial` | Partial | आंशिक |
| [ ] | `parent.fees.statusPending` | Pending | बाँकी |
| [ ] | `parent.fees.subtitle` | Fee structure and payment history. | शुल्क संरचना र भुक्तानी इतिहास। |
| [ ] | `parent.fees.totalFee` | Total Fee | जम्मा शुल्क |

## `parent.grades`

| ✓ | Key | English | नेपाली |
| --- | --- | --- | --- |
| [ ] | `parent.grades.acrossSubjects` | across {count} subjects | {count} विषयहरूमा |
| [ ] | `parent.grades.allResults` | All Results | सबै नतिजाहरू |
| [ ] | `parent.grades.assessmentCount` | {count} assessment | {count} मूल्याङ्कन |
| [ ] | `parent.grades.assessmentCountPlural` | {count} assessments | {count} मूल्याङ्कनहरू |
| [ ] | `parent.grades.badgeAverage` | Average | औसत |
| [ ] | `parent.grades.badgeExcellent` | Excellent | उत्कृष्ट |
| [ ] | `parent.grades.badgeGood` | Good | राम्रो |
| [ ] | `parent.grades.badgeNeedsHelp` | Needs Help | सहायता चाहिन्छ |
| [ ] | `parent.grades.bestSubject` | Best Subject | सबभन्दा राम्रो विषय |
| [ ] | `parent.grades.errorLoad` | Failed to load results. | नतिजाहरू लोड गर्न असफल भयो। |
| [ ] | `parent.grades.errorLoadProfile` | Failed to load parent profile. | अभिभावक प्रोफाइल लोड गर्न असफल भयो। |
| [ ] | `parent.grades.noChildren` | No children linked to your account. | तपाईंको खातामा कुनै बालबालिका जोडिएको छैन। |
| [ ] | `parent.grades.noResults` | No results available yet. | अहिलेसम्म कुनै नतिजा उपलब्ध छैन। |
| [ ] | `parent.grades.overallAverage` | Overall Average | समग्र औसत |
| [ ] | `parent.grades.pageTitle` | Grades & Results | ग्रेड र नतिजाहरू |
| [ ] | `parent.grades.sectionLabel` | Parent Portal | अभिभावक पोर्टल |
| [ ] | `parent.grades.subjectPerformance` | Subject Performance | विषय प्रदर्शन |
| [ ] | `parent.grades.subjectPerformanceDesc` | Average score per subject | प्रति विषय औसत अङ्क |
| [ ] | `parent.grades.subtitle` | Assessment scores and subject performance. | मूल्याङ्कन अङ्क र विषय प्रदर्शन। |
| [ ] | `parent.grades.totalAssessments` | Total Assessments | जम्मा मूल्याङ्कन |

## `parent.leaves`

| ✓ | Key | English | नेपाली |
| --- | --- | --- | --- |
| [ ] | `parent.leaves.btnCancel` | Cancel | रद्द गर्नुहोस् |
| [ ] | `parent.leaves.btnCancelLeave` | Cancel | रद्द गर्नुहोस् |
| [ ] | `parent.leaves.btnRequestLeave` | Request Leave | बिदा अनुरोध गर्नुहोस् |
| [ ] | `parent.leaves.btnSubmit` | Submit Request | अनुरोध पेश गर्नुहोस् |
| [ ] | `parent.leaves.btnSubmitting` | Submitting... | पेश हुँदैछ... |
| [ ] | `parent.leaves.colAction` | Action | कार्य |
| [ ] | `parent.leaves.colChild` | Child | बालबालिका |
| [ ] | `parent.leaves.colDays` | Days | दिनहरू |
| [ ] | `parent.leaves.colPeriod` | Period | अवधि |
| [ ] | `parent.leaves.colReason` | Reason | कारण |
| [ ] | `parent.leaves.colStatus` | Status | स्थिति |
| [ ] | `parent.leaves.colType` | Type | प्रकार |
| [ ] | `parent.leaves.dialogTitle` | Request Leave | बिदा अनुरोध गर्नुहोस् |
| [ ] | `parent.leaves.docUrlOptional` | (optional) | (ऐच्छिक) |
| [ ] | `parent.leaves.errorCancel` | Failed to cancel leave request. | बिदा अनुरोध रद्द गर्न असफल भयो। |
| [ ] | `parent.leaves.errorEndDate` | End date must be on or after start date. | अन्त्य मिति सुरु मितिभन्दा पहिले हुन सक्दैन। |
| [ ] | `parent.leaves.errorLoad` | Failed to load leave data | बिदा डेटा लोड गर्न असफल भयो |
| [ ] | `parent.leaves.errorRequiredFields` | Please fill in all required fields. | कृपया सबै अनिवार्य फिल्डहरू भर्नुहोस्। |
| [ ] | `parent.leaves.errorSubmit` | Failed to submit leave request. | बिदा अनुरोध पेश गर्न असफल भयो। |
| [ ] | `parent.leaves.labelChild` | Child | बालबालिका |
| [ ] | `parent.leaves.labelDocUrl` | Document URL | कागजात URL |
| [ ] | `parent.leaves.labelEndDate` | End Date | अन्त्य मिति |
| [ ] | `parent.leaves.labelLeaveType` | Leave Type | बिदाको प्रकार |
| [ ] | `parent.leaves.labelReason` | Reason | कारण |
| [ ] | `parent.leaves.labelStartDate` | Start Date | सुरु मिति |
| [ ] | `parent.leaves.leaveHistory` | Leave History | बिदा इतिहास |
| [ ] | `parent.leaves.leaveTypeEvent` | Event / Competition | कार्यक्रम / प्रतियोगिता |
| [ ] | `parent.leaves.leaveTypeFamily` | Family Emergency | पारिवारिक आपत् |
| [ ] | `parent.leaves.leaveTypeOther` | Other | अन्य |
| [ ] | `parent.leaves.leaveTypePersonal` | Personal | व्यक्तिगत |
| [ ] | `parent.leaves.leaveTypeSick` | Sick Leave | बिरामी बिदा |
| [ ] | `parent.leaves.noLeaves` | No leave requests found. | कुनै बिदा अनुरोध फेला परेन। |
| [ ] | `parent.leaves.noLeavesHint` | Click "Request Leave" to submit one. | पेश गर्न "बिदा अनुरोध गर्नुहोस्" क्लिक गर्नुहोस्। |
| [ ] | `parent.leaves.pageTitle` | Leave Requests | बिदा अनुरोधहरू |
| [ ] | `parent.leaves.placeholderChild` | Select child | बालबालिका छान्नुहोस् |
| [ ] | `parent.leaves.placeholderLeaveType` | Select type | प्रकार छान्नुहोस् |
| [ ] | `parent.leaves.placeholderReason` | Reason for leave... | बिदाको कारण... |
| [ ] | `parent.leaves.sectionLabel` | Parent Portal | अभिभावक पोर्टल |
| [ ] | `parent.leaves.statApproved` | Approved | स्वीकृत |
| [ ] | `parent.leaves.statPending` | Pending | बाँकी |
| [ ] | `parent.leaves.statRejected` | Rejected | अस्वीकृत |
| [ ] | `parent.leaves.statTotal` | Total | जम्मा |
| [ ] | `parent.leaves.statusApproved` | Approved | स्वीकृत |
| [ ] | `parent.leaves.statusCancelled` | Cancelled | रद्द गरियो |
| [ ] | `parent.leaves.statusPending` | Pending | बाँकी |
| [ ] | `parent.leaves.statusRejected` | Rejected | अस्वीकृत |
| [ ] | `parent.leaves.subtitle` | Apply and track leave requests for your children. | तपाईंका बालबालिकाका लागि बिदा अनुरोध गर्नुहोस् र ट्र्याक गर्नुहोस्। |
| [ ] | `parent.leaves.successCancelled` | Leave request cancelled. | बिदा अनुरोध रद्द गरियो। |
| [ ] | `parent.leaves.successSubmitted` | Leave request submitted successfully. | बिदा अनुरोध सफलतापूर्वक पेश भयो। |

## `parent.meetings`

| ✓ | Key | English | नेपाली |
| --- | --- | --- | --- |
| [ ] | `parent.meetings.btnCancel` | Cancel | रद्द गर्नुहोस् |
| [ ] | `parent.meetings.btnCancelMeeting` | Cancel | रद्द गर्नुहोस् |
| [ ] | `parent.meetings.btnRequestMeeting` | Request Meeting | बैठक अनुरोध गर्नुहोस् |
| [ ] | `parent.meetings.btnSendRequest` | Send Request | अनुरोध पठाउनुहोस् |
| [ ] | `parent.meetings.btnSending` | Sending... | पठाउँदैछ... |
| [ ] | `parent.meetings.confirmed` | Confirmed: {datetime} | पुष्टि भयो: {datetime} |
| [ ] | `parent.meetings.dialogTitle` | New Meeting Request | नयाँ बैठक अनुरोध |
| [ ] | `parent.meetings.errorCancel` | Failed to cancel meeting. | बैठक रद्द गर्न असफल भयो। |
| [ ] | `parent.meetings.errorMissingFields` | Please fill all required fields. | कृपया सबै अनिवार्य फिल्डहरू भर्नुहोस्। |
| [ ] | `parent.meetings.errorSubmit` | Failed to submit meeting request. | बैठक अनुरोध पेश गर्न असफल भयो। |
| [ ] | `parent.meetings.joinMeeting` | Join Meeting | बैठकमा सहभागी हुनुहोस् |
| [ ] | `parent.meetings.labelChild` | Child | बालबालिका |
| [ ] | `parent.meetings.labelPreferredDate` | Preferred Date | मनपर्ने मिति |
| [ ] | `parent.meetings.labelPreferredSlot` | Preferred Time Slot | मनपर्ने समय खण्ड |
| [ ] | `parent.meetings.labelPurpose` | Purpose / Agenda | उद्देश्य / एजेन्डा |
| [ ] | `parent.meetings.labelTeacherId` | Teacher ID | शिक्षक ID |
| [ ] | `parent.meetings.noMeetings` | No meeting requests yet. | अहिलेसम्म कुनै बैठक अनुरोध छैन। |
| [ ] | `parent.meetings.noMeetingsHint` | Click "Request Meeting" to schedule one. | तालिका गर्न "बैठक अनुरोध गर्नुहोस्" क्लिक गर्नुहोस्। |
| [ ] | `parent.meetings.pageTitle` | Parent-Teacher Meetings | अभिभावक-शिक्षक बैठकहरू |
| [ ] | `parent.meetings.placeholderChild` | Select child... | बालबालिका छान्नुहोस्... |
| [ ] | `parent.meetings.placeholderPurpose` | Describe the purpose of this meeting... | बैठकको उद्देश्य वर्णन गर्नुहोस्... |
| [ ] | `parent.meetings.placeholderTeacherId` | Teacher's ID or name... | शिक्षकको ID वा नाम... |
| [ ] | `parent.meetings.slotAfternoon` | Afternoon | दिउँसो |
| [ ] | `parent.meetings.slotAfternoonTime` | (12pm – 4pm) | (दिउँसो १२ – साँझ ४) |
| [ ] | `parent.meetings.slotEvening` | Evening | साँझ |
| [ ] | `parent.meetings.slotEveningTime` | (4pm – 7pm) | (साँझ ४ – राति ७) |
| [ ] | `parent.meetings.slotMorning` | Morning | बिहान |
| [ ] | `parent.meetings.slotMorningTime` | (8am – 12pm) | (बिहान ८ – दिउँसो १२) |
| [ ] | `parent.meetings.statusCancelled` | Cancelled | रद्द गरियो |
| [ ] | `parent.meetings.statusCompleted` | Completed | सम्पन्न |
| [ ] | `parent.meetings.statusConfirmed` | Confirmed | पुष्टि भयो |
| [ ] | `parent.meetings.statusPending` | Pending | बाँकी |
| [ ] | `parent.meetings.subtitle` | Request and track meetings with your child's teachers. | तपाईंका बालबालिकाका शिक्षकहरूसँग बैठक अनुरोध गर्नुहोस् र ट्र्याक गर्नुहोस्। |
| [ ] | `parent.meetings.successRequested` | Your request has been sent to the teacher. | तपाईंको अनुरोध शिक्षकलाई पठाइयो। |

## `parent.messages`

| ✓ | Key | English | नेपाली |
| --- | --- | --- | --- |
| [ ] | `parent.messages.emptyState` | Choose a conversation to message teachers or school staff. | शिक्षक वा विद्यालय कर्मचारीलाई सन्देश गर्न कुराकानी छान्नुहोस्। |

## `parent.nav`

| ✓ | Key | English | नेपाली |
| --- | --- | --- | --- |
| [ ] | `parent.nav.attendance` | Attendance | उपस्थिति |
| [ ] | `parent.nav.familyDashboard` | Family Dashboard | पारिवारिक ड्यासबोर्ड |
| [ ] | `parent.nav.fees` | Fees | शुल्क |
| [ ] | `parent.nav.grades` | Grades | ग्रेडहरू |
| [ ] | `parent.nav.leaveRequests` | Leave Requests | बिदा अनुरोध |
| [ ] | `parent.nav.logout` | Logout | बाहिर निस्कनुहोस् |
| [ ] | `parent.nav.meetings` | Meetings | बैठकहरू |
| [ ] | `parent.nav.messages` | Messages | सन्देशहरू |
| [ ] | `parent.nav.myChildren` | My Children | मेरा बालबालिका |
| [ ] | `parent.nav.notices` | Notices | सूचनाहरू |
| [ ] | `parent.nav.overview` | Overview | सिंहावलोकन |
| [ ] | `parent.nav.portal` | Parent Portal | अभिभावक पोर्टल |
| [ ] | `parent.nav.projects` | Projects | परियोजनाहरू |

## `parent.notices`

| ✓ | Key | English | नेपाली |
| --- | --- | --- | --- |
| [ ] | `parent.notices.badgeUnread` | UNREAD | नपढिएको |
| [ ] | `parent.notices.empty` | No notices yet. | अहिलेसम्म कुनै सूचना छैन। |
| [ ] | `parent.notices.pageTitle` | School Notices | विद्यालय सूचनाहरू |
| [ ] | `parent.notices.subtitle` | Announcements and important updates from school. | विद्यालयका घोषणाहरू र महत्त्वपूर्ण अपडेटहरू। |

## `parent.projectDetail`

| ✓ | Key | English | नेपाली |
| --- | --- | --- | --- |
| [ ] | `parent.projectDetail.activity` | Activity | गतिविधि |
| [ ] | `parent.projectDetail.description` | Description | विवरण |
| [ ] | `parent.projectDetail.goBack` | Go back | पछाडि जानुहोस् |
| [ ] | `parent.projectDetail.loadingActivity` | Loading activity… | गतिविधि लोड हुँदैछ… |
| [ ] | `parent.projectDetail.loadingTasks` | Loading tasks… | कार्यहरू लोड हुँदैछ… |
| [ ] | `parent.projectDetail.notFound` | Project not found. | परियोजना फेला परेन। |
| [ ] | `parent.projectDetail.progress` | Progress | प्रगति |
| [ ] | `parent.projectDetail.tasks` | Tasks | कार्यहरू |

## `parent.projects`

| ✓ | Key | English | नेपाली |
| --- | --- | --- | --- |
| [ ] | `parent.projects.due` | Due | म्याद |
| [ ] | `parent.projects.empty` | No active projects right now. | अहिले कुनै सक्रिय परियोजना छैन। |
| [ ] | `parent.projects.errorLoad` | Failed to load projects. | परियोजनाहरू लोड गर्न असफल भयो। |
| [ ] | `parent.projects.finalGrade` | Final grade | अन्तिम ग्रेड |
| [ ] | `parent.projects.mentor` | Mentor | मार्गदर्शक |
| [ ] | `parent.projects.pageTitle` | Children's Projects | बालबालिकाका परियोजनाहरू |
| [ ] | `parent.projects.status_active` | Active | सक्रिय |
| [ ] | `parent.projects.status_archived` | Archived | अभिलेखित |
| [ ] | `parent.projects.status_draft` | Draft | मस्यौदा |
| [ ] | `parent.projects.status_graded` | Graded | ग्रेड भयो |
| [ ] | `parent.projects.status_submitted` | Submitted | पेश भयो |
| [ ] | `parent.projects.subtitle` | Read-only view of group + individual projects your children are part of. | तपाईंका बालबालिका भएका समूह र व्यक्तिगत परियोजनाहरूको पठन-मात्र दृश्य। |
| [ ] | `parent.projects.taskCount` | {count} task | {count} कार्य |
| [ ] | `parent.projects.taskCountPlural` | {count} tasks | {count} कार्यहरू |

## `student.achievements`

| ✓ | Key | English | नेपाली |
| --- | --- | --- | --- |
| [ ] | `student.achievements.badgesCount` | {count} Badges | {count} ब्याजहरू |
| [ ] | `student.achievements.classLeaderboard` | Class Leaderboard | कक्षा लिडरबोर्ड |
| [ ] | `student.achievements.pageTitle` | Your Achievements | तपाईंका उपलब्धिहरू |
| [ ] | `student.achievements.subtitle` | Track your progress and earn rewards! | तपाईंको प्रगति ट्र्याक गर्नुहोस् र पुरस्कार कमाउनुहोस्! |
| [ ] | `student.achievements.tabBadges` | Badges | ब्याजहरू |
| [ ] | `student.achievements.tabLeaderboard` | Leaderboard | लिडरबोर्ड |
| [ ] | `student.achievements.xpPoints` | {points} XP | {points} XP |

## `student.aiTutor`

| ✓ | Key | English | नेपाली |
| --- | --- | --- | --- |
| [ ] | `student.aiTutor.budgetResetsAt` | Resets at {time}. | मध्यरातमा रिसेट हुन्छ: {time}। |
| [ ] | `student.aiTutor.budgetTitle` | Daily AI limit reached. | दैनिक AI सीमा पुग्यो। |
| [ ] | `student.aiTutor.budgetWarning` | AI budget at {pct}% — resets at midnight UTC. | AI बजेट {pct}% — मध्यरात UTC मा रिसेट हुन्छ। |
| [ ] | `student.aiTutor.clearChat` | Clear Chat | कुराकानी मेटाउनुहोस् |
| [ ] | `student.aiTutor.clearConfirm` | Are you sure you want to clear the conversation? | के तपाईं साँच्चै कुराकानी मेटाउन चाहनुहुन्छ? |
| [ ] | `student.aiTutor.clearedSuccess` | Conversation cleared | कुराकानी मेटाइयो |
| [ ] | `student.aiTutor.confidenceSuffix` | confidence | विश्वसनीयता |
| [ ] | `student.aiTutor.emptyHint` | Ask me anything about your studies. I'm here to help you learn! | आफ्नो पढाइबारे जे मन लाग्छ सोध्नुहोस्। म तपाईंलाई सिक्न मद्दत गर्न यहाँ छु! |
| [ ] | `student.aiTutor.emptyTitle` | Start a conversation | कुराकानी सुरु गर्नुहोस् |
| [ ] | `student.aiTutor.errorResponse` | Failed to get AI response | AI प्रतिक्रिया प्राप्त गर्न असफल भयो |
| [ ] | `student.aiTutor.failureReply` | I could not process that right now. Please try again in a moment. | म अहिले यो प्रक्रिया गर्न सकिनँ। कृपया केही क्षणपछि फेरि प्रयास गर्नुहोस्। |
| [ ] | `student.aiTutor.inputPlaceholder` | Ask me anything... | जे मन लाग्छ सोध्नुहोस्... |
| [ ] | `student.aiTutor.pageTitle` | AI Tutor | AI शिक्षक |
| [ ] | `student.aiTutor.sourcesLabel` | Sources | स्रोतहरू |
| [ ] | `student.aiTutor.statusConnecting` | Connecting | जोडिँदैछ |
| [ ] | `student.aiTutor.statusLive` | Live | लाइभ |
| [ ] | `student.aiTutor.statusOffline` | Offline | अफलाइन |
| [ ] | `student.aiTutor.tagline` | Your personal learning assistant | तपाईंको व्यक्तिगत सिकाइ सहायक |
| [ ] | `student.aiTutor.thinking` | Thinking... | सोच्दैछु... |

## `student.assessmentResults`

| ✓ | Key | English | नेपाली |
| --- | --- | --- | --- |
| [ ] | `student.assessmentResults.accuracyScore` | Accuracy Score | शुद्धता अङ्क |
| [ ] | `student.assessmentResults.aiAnalysisTitle` | AI Performance Analysis | AI प्रदर्शन विश्लेषण |
| [ ] | `student.assessmentResults.aiInsightsLabel` | AI Insights & Corrections | AI अन्तर्दृष्टि र सुधारहरू |
| [ ] | `student.assessmentResults.assessmentsHub` | Assessments Hub | मूल्याङ्कन केन्द्र |
| [ ] | `student.assessmentResults.backToList` | Back to Assessment List | मूल्याङ्कन सूचीमा फर्कनुहोस् |
| [ ] | `student.assessmentResults.badgeCompleted` | COMPLETED | सम्पन्न |
| [ ] | `student.assessmentResults.correctSolution` | Correct Solution | सही समाधान |
| [ ] | `student.assessmentResults.detailedAnswerReview` | Detailed Answer Review | विस्तृत उत्तर समीक्षा |
| [ ] | `student.assessmentResults.heroSubtitle` | Great job finishing this assessment! Here's how you performed. | यो मूल्याङ्कन सम्पन्न गर्नुभएकोमा बधाई! तपाईंको प्रदर्शन यस्तो रह्यो। |
| [ ] | `student.assessmentResults.loading` | Analyzing your performance... | तपाईंको प्रदर्शन विश्लेषण गर्दैछ... |
| [ ] | `student.assessmentResults.masteryByTopic` | Mastery by Topic | विषयगत दक्षता |
| [ ] | `student.assessmentResults.noAnswerProvided` | No answer provided | कुनै उत्तर दिइएको छैन |
| [ ] | `student.assessmentResults.notFound` | Result not found. | परिणाम फेला परेन। |
| [ ] | `student.assessmentResults.quickLinks` | Quick Links | द्रुत लिंकहरू |
| [ ] | `student.assessmentResults.requirementMet` | Requirement Met | आवश्यकता पूरा भयो |
| [ ] | `student.assessmentResults.requirementMetDesc` | You have surpassed the passing marks for this assessment. | तपाईंले यस मूल्याङ्कनको उत्तीर्ण अङ्क नाघ्नुभएको छ। |
| [ ] | `student.assessmentResults.reviewAnswers` | Review Answers | उत्तरहरू समीक्षा गर्नुहोस् |
| [ ] | `student.assessmentResults.rewardsEarned` | Rewards Earned | पुरस्कार कमाइएको |
| [ ] | `student.assessmentResults.scoreLabel` | Score | अङ्क |
| [ ] | `student.assessmentResults.studyPlan` | Study Plan | अध्ययन योजना |
| [ ] | `student.assessmentResults.timeTaken` | Time Taken | लागेको समय |
| [ ] | `student.assessmentResults.totalMarksEarned` | Total Marks Earned | कमाइएका जम्मा अङ्क |
| [ ] | `student.assessmentResults.yourResponse` | Your Response | तपाईंको उत्तर |

## `student.assessmentTake`

| ✓ | Key | English | नेपाली |
| --- | --- | --- | --- |
| [ ] | `student.assessmentTake.btnNextQuestion` | Next Question | अर्को प्रश्न |
| [ ] | `student.assessmentTake.btnPrevious` | Previous | अघिल्लो |
| [ ] | `student.assessmentTake.btnSubmitQuiz` | Submit Quiz | पेश गर्नुहोस् |
| [ ] | `student.assessmentTake.draftSaved` | Draft saved! | मस्यौदा सुरक्षित भयो! |
| [ ] | `student.assessmentTake.errorLoad` | Failed to load assessment | मूल्याङ्कन लोड गर्न असफल भयो |
| [ ] | `student.assessmentTake.errorSubmit` | Failed to submit assessment | मूल्याङ्कन पेश गर्न असफल भयो |
| [ ] | `student.assessmentTake.labelYourAnswer` | Your Answer | तपाईंको उत्तर |
| [ ] | `student.assessmentTake.legendAnswered` | Answered | उत्तर दिइएको |
| [ ] | `student.assessmentTake.legendCurrent` | Current | हालको |
| [ ] | `student.assessmentTake.legendRemaining` | Remaining | बाँकी |
| [ ] | `student.assessmentTake.loading` | Loading assessment... | मूल्याङ्कन लोड हुँदैछ... |
| [ ] | `student.assessmentTake.navigatorTitle` | Navigator | नेभिगेटर |
| [ ] | `student.assessmentTake.noQuestions` | No questions in this assessment. | यस मूल्याङ्कनमा कुनै प्रश्न छैन। |
| [ ] | `student.assessmentTake.notFound` | Assessment not found | मूल्याङ्कन फेला परेन |
| [ ] | `student.assessmentTake.placeholderAnswer` | Type your answer here... | यहाँ उत्तर टाइप गर्नुहोस्... |
| [ ] | `student.assessmentTake.pointsBadge` | {points} Points | {points} अङ्क |
| [ ] | `student.assessmentTake.proctoringDesc` | Switching tabs or leaving the fullscreen mode will be flagged. | ट्याब परिवर्तन वा फुलस्क्रिन मोड छोड्दा रेकर्ड हुनेछ। |
| [ ] | `student.assessmentTake.proctoringTitle` | Proctoring Active | निरीक्षण सक्रिय |
| [ ] | `student.assessmentTake.questionOf` | Question {current} of {total} | प्रश्न {current} / {total} |
| [ ] | `student.assessmentTake.saveDraft` | Save Draft | मस्यौदा सुरक्षित गर्नुहोस् |
| [ ] | `student.assessmentTake.submitting` | Submitting... | पेश हुँदैछ... |
| [ ] | `student.assessmentTake.syntaxHint` | Syntax highlighting not available in preview | पूर्वावलोकनमा सिन्ट्याक्स हाइलाइटिङ उपलब्ध छैन |

## `student.assessments`

| ✓ | Key | English | नेपाली |
| --- | --- | --- | --- |
| [ ] | `student.assessments.aiInsight` | AI Insight | AI अन्तर्दृष्टि |
| [ ] | `student.assessments.aiInsightText` | Your strongest scores are in recently attempted assessments. Review low-scoring Bloom levels from Skill Breakdown for targeted improvement. | तपाईंका सबभन्दा बलिया अङ्क हालैका मूल्याङ्कनहरूमा छन्। लक्षित सुधारका लागि सीप विश्लेषणबाट कम अङ्क भएका ब्लुम्स स्तरहरू समीक्षा गर्नुहोस्। |
| [ ] | `student.assessments.allCaughtUp` | You're all caught up! No upcoming tests. | तपाईं अप-टु-डेट हुनुहुन्छ! कुनै आगामी परीक्षा छैन। |
| [ ] | `student.assessments.classAvg` | Class Avg | कक्षा औसत |
| [ ] | `student.assessments.loading` | Loading Assessments... | मूल्याङ्कनहरू लोड हुँदैछ... |
| [ ] | `student.assessments.marks` | Marks | अङ्क |
| [ ] | `student.assessments.noDescription` | No description provided. | कुनै विवरण उपलब्ध छैन। |
| [ ] | `student.assessments.noSkillData` | No skill data available. | कुनै सीप डेटा उपलब्ध छैन। |
| [ ] | `student.assessments.notEnoughResults` | Not enough results to draw trend. | प्रवृत्ति देखाउन पर्याप्त परिणाम छैन। |
| [ ] | `student.assessments.pageTitle` | Exams & Performance | परीक्षा र प्रदर्शन |
| [ ] | `student.assessments.performanceTrend` | Performance Trend | प्रदर्शन प्रवृत्ति |
| [ ] | `student.assessments.performanceTrendDesc` | Your scores vs class average over time | समय अनुसार तपाईंका अङ्क बनाम कक्षाको औसत |
| [ ] | `student.assessments.recentResults` | Recent Results | हालैका परिणामहरू |
| [ ] | `student.assessments.skillBreakdown` | Skill Breakdown | सीप विश्लेषण |
| [ ] | `student.assessments.skillBreakdownDesc` | Based on Bloom's taxonomy levels | ब्लुम्सको वर्गीकरण स्तरमा आधारित |
| [ ] | `student.assessments.start` | Start | सुरु गर्नुहोस् |
| [ ] | `student.assessments.subtitle` | Track your progress and analyze detailed performance. | तपाईंको प्रगति ट्र्याक गर्नुहोस् र विस्तृत प्रदर्शन विश्लेषण गर्नुहोस्। |
| [ ] | `student.assessments.upcomingAssessments` | Upcoming Assessments | आगामी मूल्याङ्कनहरू |
| [ ] | `student.assessments.viewDetailedReport` | View Detailed Report | विस्तृत रिपोर्ट हेर्नुहोस् |
| [ ] | `student.assessments.yourScore` | Your Score | तपाईंको अङ्क |

## `student.assignmentDetail`

| ✓ | Key | English | नेपाली |
| --- | --- | --- | --- |
| [ ] | `student.assignmentDetail.aiFeedbackHint` | Check your results in the Exams tab for detailed feedback. | विस्तृत प्रतिक्रियाको लागि परीक्षा ट्याबमा आफ्नो नतिजाहरू जाँच गर्नुहोस्। |
| [ ] | `student.assignmentDetail.aiFeedbackTitle` | AI Feedback | AI प्रतिक्रिया |
| [ ] | `student.assignmentDetail.backToAssignments` | Back to Assignments | गृहकार्यहरूमा फर्कनुहोस् |
| [ ] | `student.assignmentDetail.btnAIProofread` | AI Proofread | AI प्रुफरिड |
| [ ] | `student.assignmentDetail.btnGradeWithAI` | Grade with AI | AI सँग ग्रेड गर्नुहोस् |
| [ ] | `student.assignmentDetail.btnSaveDraft` | Save Draft | मस्यौदा सुरक्षित गर्नुहोस् |
| [ ] | `student.assignmentDetail.btnSubmitAssignment` | Submit Assignment | गृहकार्य पेश गर्नुहोस् |
| [ ] | `student.assignmentDetail.confirmAIGrade` | Request AI grading for this assignment? | यो गृहकार्यको लागि AI ग्रेडिङ अनुरोध गर्ने? |
| [ ] | `student.assignmentDetail.criteriaClarity` | Clarity of thought (40%) | विचारको स्पष्टता (४०%) |
| [ ] | `student.assignmentDetail.criteriaEvidence` | Evidence and examples (30%) | प्रमाण र उदाहरणहरू (३०%) |
| [ ] | `student.assignmentDetail.criteriaGrammar` | Grammar and structure (30%) | व्याकरण र संरचना (३०%) |
| [ ] | `student.assignmentDetail.labelGradingCriteria` | Grading Criteria: | ग्रेडिङ मापदण्ड: |
| [ ] | `student.assignmentDetail.labelInstructions` | Instructions: | निर्देशनहरू: |
| [ ] | `student.assignmentDetail.labelNoInstructions` | No instructions provided. | कुनै निर्देशन प्रदान गरिएको छैन। |
| [ ] | `student.assignmentDetail.labelYourResponse` | Your Response | तपाईंको उत्तर |
| [ ] | `student.assignmentDetail.loadingSpinner` | Loading… | लोड हुँदैछ… |
| [ ] | `student.assignmentDetail.notFound` | Assignment not found | गृहकार्य फेला परेन |
| [ ] | `student.assignmentDetail.placeholderResponse` | Type your essay or response here... | यहाँ आफ्नो निबन्ध वा उत्तर टाइप गर्नुहोस्... |
| [ ] | `student.assignmentDetail.statusLabel` | Status | स्थिति |
| [ ] | `student.assignmentDetail.submittedOn` | Submitted on {date} | {date} मा पेश भयो |
| [ ] | `student.assignmentDetail.toastDraftSaved` | Draft saved | मस्यौदा सुरक्षित भयो |
| [ ] | `student.assignmentDetail.toastGradingFailed` | Grading failed | ग्रेडिङ असफल भयो |
| [ ] | `student.assignmentDetail.toastGradingSuccess` | AI grading completed. Score: {score} | AI ग्रेडिङ सम्पन्न। अङ्क: {score} |
| [ ] | `student.assignmentDetail.toastGradingSuccessNoScore` | AI grading completed | AI ग्रेडिङ सम्पन्न |
| [ ] | `student.assignmentDetail.toastLoadFailed` | Failed to load assignment details | गृहकार्यको विवरण लोड गर्न असफल भयो |
| [ ] | `student.assignmentDetail.toastProofreadEmpty` | AI proofread returned an empty response | AI प्रुफरिडले खाली उत्तर फर्कायो |
| [ ] | `student.assignmentDetail.toastProofreadFailed` | AI proofread failed | AI प्रुफरिड असफल भयो |
| [ ] | `student.assignmentDetail.toastProofreadNoContent` | Write your response before AI proofread | AI प्रुफरिड अघि आफ्नो उत्तर लेख्नुहोस् |
| [ ] | `student.assignmentDetail.toastProofreadSuccess` | AI proofread applied | AI प्रुफरिड लागू भयो |
| [ ] | `student.assignmentDetail.toastSubmitFailed` | Failed to submit assignment | गृहकार्य पेश गर्न असफल भयो |
| [ ] | `student.assignmentDetail.toastSubmitSuccess` | Assignment submitted successfully | गृहकार्य सफलतापूर्वक पेश भयो |

## `student.assignments`

| ✓ | Key | English | नेपाली |
| --- | --- | --- | --- |
| [ ] | `student.assignments.awaitingGrades` | Awaiting grades | अङ्कको प्रतीक्षामा |
| [ ] | `student.assignments.badgeDueSoon` | DUE SOON | चाँडै सकिन्छ |
| [ ] | `student.assignments.badgeGraded` | GRADED | अङ्कित |
| [ ] | `student.assignments.badgeOverdue` | OVERDUE | ढिलो |
| [ ] | `student.assignments.badgePending` | PENDING | बाँकी |
| [ ] | `student.assignments.badgeSubmitted` | SUBMITTED | पेश गरिएको |
| [ ] | `student.assignments.daysLate` | {count}d late | {count} दिन ढिलो |
| [ ] | `student.assignments.daysLeft` | {count}d left | {count} दिन बाँकी |
| [ ] | `student.assignments.dueToday` | Due today | आज बुझाउनु पर्छ |
| [ ] | `student.assignments.emptyGraded` | No graded assignments yet. Submit work and check back soon. | अहिलेसम्म कुनै अङ्कित गृहकार्य छैन। काम पेश गर्नुहोस् र पछि जाँच गर्नुहोस्। |
| [ ] | `student.assignments.emptyPending` | No pending assignments — you're all caught up! | कुनै बाँकी गृहकार्य छैन — तपाईं अप-टु-डेट हुनुहुन्छ! |
| [ ] | `student.assignments.emptySubmitted` | Nothing submitted yet. Start with your pending work! | अहिलेसम्म केही पेश गरिएको छैन। बाँकी कामबाट सुरु गर्नुहोस्! |
| [ ] | `student.assignments.errorLoad` | Failed to load assignments. Please try again. | गृहकार्यहरू लोड गर्न असफल भयो। कृपया फेरि प्रयास गर्नुहोस्। |
| [ ] | `student.assignments.loading` | Loading assignments… | गृहकार्यहरू लोड हुँदैछ… |
| [ ] | `student.assignments.noDeadline` | No deadline | कुनै समयसीमा छैन |
| [ ] | `student.assignments.overdueCount` | {count} overdue | {count} ढिलो |
| [ ] | `student.assignments.pageTitle` | Assignments | गृहकार्यहरू |
| [ ] | `student.assignments.pts` | pts | अङ्क |
| [ ] | `student.assignments.resultsAvailable` | Results available | परिणाम उपलब्ध |
| [ ] | `student.assignments.sectionLabel` | My Work | मेरो काम |
| [ ] | `student.assignments.startAssignment` | Start Assignment | गृहकार्य सुरु गर्नुहोस् |
| [ ] | `student.assignments.statGraded` | Graded | अङ्कित |
| [ ] | `student.assignments.statPending` | Pending | बाँकी |
| [ ] | `student.assignments.statSubmitted` | Submitted | पेश गरिएको |
| [ ] | `student.assignments.submitNow` | Submit Now | अहिले पेश गर्नुहोस् |
| [ ] | `student.assignments.subtitle` | Track pending coursework, submit assignments, and view grades. | बाँकी कोर्सवर्क ट्र्याक गर्नुहोस्, गृहकार्य पेश गर्नुहोस्, र अङ्कहरू हेर्नुहोस्। |
| [ ] | `student.assignments.tabGraded` | Graded ({count}) | अङ्कित ({count}) |
| [ ] | `student.assignments.tabPending` | Pending ({count}) | बाँकी ({count}) |
| [ ] | `student.assignments.tabSubmitted` | Submitted ({count}) | पेश गरिएको ({count}) |
| [ ] | `student.assignments.viewDetails` | View Details | विवरण हेर्नुहोस् |

## `student.attendance`

| ✓ | Key | English | नेपाली |
| --- | --- | --- | --- |
| [ ] | `student.attendance.attendanceRate` | Attendance Rate | उपस्थिति दर |
| [ ] | `student.attendance.calendarView` | Calendar View | क्यालेन्डर दृश्य |
| [ ] | `student.attendance.clickToView` | Click any date to view records | रेकर्ड हेर्न कुनै मिति क्लिक गर्नुहोस् |
| [ ] | `student.attendance.critical` | Critical | गम्भीर |
| [ ] | `student.attendance.errorLoad` | Failed to load attendance records. | उपस्थिति रेकर्ड लोड गर्न असफल भयो। |
| [ ] | `student.attendance.goodStanding` | Good Standing | राम्रो अवस्था |
| [ ] | `student.attendance.legendAbsent` | Absent | अनुपस्थित |
| [ ] | `student.attendance.legendLate` | Late | ढिलो |
| [ ] | `student.attendance.legendPresent` | Present | उपस्थित |
| [ ] | `student.attendance.loading` | Loading attendance… | उपस्थिति लोड हुँदैछ… |
| [ ] | `student.attendance.needsImprovement` | Needs Improvement | सुधार आवश्यक |
| [ ] | `student.attendance.noRecordsHint` | Select a highlighted date on the calendar to view attendance details. | उपस्थिति विवरण हेर्न क्यालेन्डरमा हाइलाइट गरिएको मिति चयन गर्नुहोस्। |
| [ ] | `student.attendance.noRecordsTitle` | No records for this date | यस मितिका लागि कुनै रेकर्ड छैन |
| [ ] | `student.attendance.note` | Note: {remarks} | नोट: {remarks} |
| [ ] | `student.attendance.overall` | Overall | समग्र |
| [ ] | `student.attendance.pageTitle` | Attendance | उपस्थिति |
| [ ] | `student.attendance.record` | Attendance Record | उपस्थिति रेकर्ड |
| [ ] | `student.attendance.recordCount` | {count} record | {count} रेकर्ड |
| [ ] | `student.attendance.recordCountPlural` | {count} records | {count} रेकर्डहरू |
| [ ] | `student.attendance.statAbsent` | Absent | अनुपस्थित |
| [ ] | `student.attendance.statExcused` | Excused | माफ गरिएको |
| [ ] | `student.attendance.statLate` | Late | ढिलो |
| [ ] | `student.attendance.statPresent` | Present | उपस्थित |
| [ ] | `student.attendance.subject` | Subject | विषय |
| [ ] | `student.attendance.subtitle` | Track your class attendance and punctuality. | तपाईंको कक्षा उपस्थिति र समयनिष्ठा ट्र्याक गर्नुहोस्। |

## `student.classes`

| ✓ | Key | English | नेपाली |
| --- | --- | --- | --- |
| [ ] | `student.classes.badgeActive` | Active | सक्रिय |
| [ ] | `student.classes.btnAssignments` | Assignments | गृहकार्यहरू |
| [ ] | `student.classes.btnViewMaterials` | View Materials | सामग्री हेर्नुहोस् |
| [ ] | `student.classes.errorLoad` | Failed to load classes. | कक्षाहरू लोड गर्न असफल भयो। |
| [ ] | `student.classes.labelAssignedTeacher` | Assigned Teacher | तोकिएको शिक्षक |
| [ ] | `student.classes.labelCourseProgress` | Course Progress | विषय प्रगति |
| [ ] | `student.classes.labelInstructor` | Instructor | प्रशिक्षक |
| [ ] | `student.classes.labelNoSchedule` | No schedule assigned yet | अहिलेसम्म कुनै तालिका तोकिएको छैन |
| [ ] | `student.classes.labelScheduleUnavailable` | Schedule unavailable | तालिका उपलब्ध छैन |
| [ ] | `student.classes.loading` | Loading classes… | कक्षाहरू लोड हुँदैछ… |
| [ ] | `student.classes.noClassesHint` | You don't seem to be enrolled in any classes yet. | तपाईं अहिलेसम्म कुनै कक्षामा भर्ना भएको देखिँदैन। |
| [ ] | `student.classes.noClassesTitle` | No Classes Found | कुनै कक्षा फेला परेन |
| [ ] | `student.classes.pageTitle` | My Classes | मेरा कक्षाहरू |
| [ ] | `student.classes.statActiveThisWeek` | Active This Week | यो हप्ता सक्रिय |
| [ ] | `student.classes.statAvgProgress` | Average Progress | औसत प्रगति |
| [ ] | `student.classes.statTotalCourses` | Total Courses | जम्मा विषयहरू |
| [ ] | `student.classes.subtitle` | View all your enrolled courses and track your progress | तपाईंका भर्ना भएका सबै विषयहरू हेर्नुहोस् र प्रगति ट्र्याक गर्नुहोस् |

## `student.complaints`

| ✓ | Key | English | नेपाली |
| --- | --- | --- | --- |
| [ ] | `student.complaints.anonymousHint` | Your name will be hidden from staff | तपाईंको नाम कर्मचारीहरूबाट लुकाइनेछ |
| [ ] | `student.complaints.anonymousLabel` | Submit Anonymously | गुमनाम रूपमा पेश गर्नुहोस् |
| [ ] | `student.complaints.dialogTitle` | Report an Issue | समस्या रिपोर्ट गर्नुहोस् |
| [ ] | `student.complaints.errorLoad` | Failed to load complaints. | उजुरीहरू लोड गर्न असफल भयो। |
| [ ] | `student.complaints.errorRequiredFields` | Please fill in all required fields. | कृपया सबै अनिवार्य फिल्डहरू भर्नुहोस्। |
| [ ] | `student.complaints.errorSubmit` | Failed to submit complaint. | उजुरी पेश गर्न असफल भयो। |
| [ ] | `student.complaints.labelCategory` | Category | श्रेणी |
| [ ] | `student.complaints.labelDescription` | Description | विवरण |
| [ ] | `student.complaints.labelPriority` | Priority | प्राथमिकता |
| [ ] | `student.complaints.labelTitle` | Title | शीर्षक |
| [ ] | `student.complaints.noComplaints` | No complaints submitted yet. | अहिलेसम्म कुनै उजुरी पेश गरिएको छैन। |
| [ ] | `student.complaints.pageTitle` | My Complaints | मेरा उजुरीहरू |
| [ ] | `student.complaints.placeholderDescription` | Describe the issue in detail... | समस्याको विस्तृत विवरण दिनुहोस्... |
| [ ] | `student.complaints.placeholderTitle` | Brief title... | छोटो शीर्षक... |
| [ ] | `student.complaints.priorityHigh` | High | उच्च |
| [ ] | `student.complaints.priorityLow` | Low | न्यून |
| [ ] | `student.complaints.priorityMedium` | Medium | मध्यम |
| [ ] | `student.complaints.reportIssue` | Report Issue | समस्या रिपोर्ट गर्नुहोस् |
| [ ] | `student.complaints.resolution` | Resolution | समाधान |
| [ ] | `student.complaints.submit` | Submit | पेश गर्नुहोस् |
| [ ] | `student.complaints.submittedComplaints` | Submitted Complaints | पेश गरिएका उजुरीहरू |
| [ ] | `student.complaints.submitting` | Submitting... | पेश हुँदैछ... |
| [ ] | `student.complaints.subtitle` | Report issues and track their resolution. | समस्याहरू रिपोर्ट गर्नुहोस् र तिनको समाधान ट्र्याक गर्नुहोस्। |
| [ ] | `student.complaints.successSubmitted` | Complaint submitted. We will review it shortly. | उजुरी पेश भयो। हामी चाँडै समीक्षा गर्नेछौं। |

## `student.courses`

| ✓ | Key | English | नेपाली |
| --- | --- | --- | --- |
| [ ] | `student.courses.completedProgress` | {completed}/{total} completed | {completed}/{total} सम्पन्न |
| [ ] | `student.courses.courseDetail.btnResume` | Resume Learning | सिकाइ जारी राख्नुहोस् |
| [ ] | `student.courses.courseDetail.btnReview` | Review Course | विषय समीक्षा गर्नुहोस् |
| [ ] | `student.courses.courseDetail.btnStart` | Start Course | विषय सुरु गर्नुहोस् |
| [ ] | `student.courses.courseDetail.btnStartLesson` | Start Lesson | पाठ सुरु गर्नुहोस् |
| [ ] | `student.courses.courseDetail.contentDuration` | 12h 30m Content | १२ घण्टा ३० मिनेट सामग्री |
| [ ] | `student.courses.courseDetail.courseContent` | Course Content | विषय सामग्री |
| [ ] | `student.courses.courseDetail.defaultDescription` | No description available for this course. | यस विषयको लागि कुनै विवरण उपलब्ध छैन। |
| [ ] | `student.courses.courseDetail.inProgress` | In Progress {pct}% | प्रगतिमा {pct}% |
| [ ] | `student.courses.courseDetail.lessonsCount` | {count} Lessons | {count} पाठहरू |
| [ ] | `student.courses.courseDetail.lessonsCountBadge` | {count} Lessons | {count} पाठहरू |
| [ ] | `student.courses.courseDetail.loading` | Loading course… | विषय लोड हुँदैछ… |
| [ ] | `student.courses.courseDetail.noLessonsInChapter` | No lessons available in this chapter. | यस अध्यायमा कुनै पाठ उपलब्ध छैन। |
| [ ] | `student.courses.courseDetail.notFound` | Course not found | विषय फेला परेन |
| [ ] | `student.courses.courseDetail.progressCompleted` | {pct}% Completed | {pct}% सम्पन्न |
| [ ] | `student.courses.courseDetail.progressLabel` | Your Progress | तपाईंको प्रगति |
| [ ] | `student.courses.courseDetail.toastLoadFail` | Failed to load course content | विषय सामग्री लोड गर्न असफल भयो |
| [ ] | `student.courses.courseLessons.badgeCompleted` | COMPLETED | सम्पन्न |
| [ ] | `student.courses.courseLessons.badgeInProgress` | IN PROGRESS {pct}% | प्रगतिमा {pct}% |
| [ ] | `student.courses.courseLessons.btnReview` | Review | समीक्षा |
| [ ] | `student.courses.courseLessons.btnSave` | Save | सुरक्षित गर्नुहोस् |
| [ ] | `student.courses.courseLessons.btnSaved` | Saved | सुरक्षित |
| [ ] | `student.courses.courseLessons.btnStartLesson` | Start Lesson | पाठ सुरु गर्नुहोस् |
| [ ] | `student.courses.courseLessons.curriculum` | Course Curriculum | विषय पाठ्यक्रम |
| [ ] | `student.courses.courseLessons.journeySubtitle` | {completed} of {total} lessons completed | {total} मध्ये {completed} पाठहरू सम्पन्न |
| [ ] | `student.courses.courseLessons.journeyTitle` | Your Learning Journey | तपाईंको सिकाइ यात्रा |
| [ ] | `student.courses.courseLessons.lessonLabel` | Lesson {chapter}.{lesson} | पाठ {chapter}.{lesson} |
| [ ] | `student.courses.courseLessons.noContentHint` | Stay tuned! Your teacher will upload lessons soon. | प्रतीक्षा गर्नुहोस्! तपाईंको शिक्षकले चाँडै पाठहरू अपलोड गर्नुहुनेछ। |
| [ ] | `student.courses.courseLessons.noContentTitle` | No content yet | अहिलेसम्म सामग्री छैन |
| [ ] | `student.courses.courseLessons.noLessonsInChapter` | No lessons published in this chapter yet. | यस अध्यायमा अहिलेसम्म कुनै पाठ प्रकाशित भएको छैन। |
| [ ] | `student.courses.courseLessons.titleDownloadOffline` | Download for offline study | अफलाइन अध्ययनका लागि डाउनलोड गर्नुहोस् |
| [ ] | `student.courses.courseLessons.titleRemoveOffline` | Remove offline copy | अफलाइन प्रति हटाउनुहोस् |
| [ ] | `student.courses.courseLessons.toastDownloadFail` | Download failed. Please try again. | डाउनलोड असफल भयो। फेरि प्रयास गर्नुहोस्। |
| [ ] | `student.courses.courseLessons.toastLoadFail` | Failed to load course content | विषय सामग्री लोड गर्न असफल भयो |
| [ ] | `student.courses.courseLessons.toastOffline` | Connect to internet to download this lesson. | यो पाठ डाउनलोड गर्न इन्टरनेटमा जडान गर्नुहोस्। |
| [ ] | `student.courses.courseLessons.toastRemoved` | "{title}" removed from offline storage. | "{title}" अफलाइन भण्डारणबाट हटाइयो। |
| [ ] | `student.courses.courseLessons.toastSaved` | "{title}" saved for offline study! | "{title}" अफलाइन अध्ययनका लागि सुरक्षित गरियो! |
| [ ] | `student.courses.ctaContinue` | Continue | जारी राख्नुहोस् |
| [ ] | `student.courses.ctaReview` | Review Course | विषय समीक्षा गर्नुहोस् |
| [ ] | `student.courses.ctaStart` | Start Now | अहिले सुरु गर्नुहोस् |
| [ ] | `student.courses.enrolledSubjects` | Enrolled Subjects | भर्ना भएका विषयहरू |
| [ ] | `student.courses.errorLoadCourses` | Failed to load courses | विषयहरू लोड गर्न असफल भयो |
| [ ] | `student.courses.lessonView.aiSectionTitle` | AI Summary & Exam Notes | AI सारांश र परीक्षा नोटहरू |
| [ ] | `student.courses.lessonView.artifactBullets` | Bullets | बुँदाहरू |
| [ ] | `student.courses.lessonView.artifactKeyTerms` | Key Terms | मुख्य शब्दहरू |
| [ ] | `student.courses.lessonView.artifactPracticeQuestions` | Practice Questions | अभ्यास प्रश्नहरू |
| [ ] | `student.courses.lessonView.btnCompleted` | Completed | सम्पन्न |
| [ ] | `student.courses.lessonView.btnFinishCourse` | Finish Course | विषय समाप्त गर्नुहोस् |
| [ ] | `student.courses.lessonView.btnGenerateExamNotes` | Generate Exam Notes | परीक्षा नोट बनाउनुहोस् |
| [ ] | `student.courses.lessonView.btnGenerateSummary` | Generate Summary | सारांश बनाउनुहोस् |
| [ ] | `student.courses.lessonView.btnGenerating` | Generating... | बनाउँदैछ... |
| [ ] | `student.courses.lessonView.btnMarkComplete` | Mark Complete | सम्पन्न चिन्ह लगाउनुहोस् |
| [ ] | `student.courses.lessonView.btnNextLesson` | Next Lesson | अर्को पाठ |
| [ ] | `student.courses.lessonView.btnPrevious` | Previous | अघिल्लो |
| [ ] | `student.courses.lessonView.chapterLabel` | Chapter {num}: {title} | अध्याय {num}: {title} |
| [ ] | `student.courses.lessonView.courseContentTitle` | Course Content | विषय सामग्री |
| [ ] | `student.courses.lessonView.fallbackChapterTitle` | Course Content | विषय सामग्री |
| [ ] | `student.courses.lessonView.interactiveSubtitle` | Interactive Learning Session | अन्तरक्रियात्मक सिकाइ सत्र |
| [ ] | `student.courses.lessonView.langEnglish` | English | अंग्रेजी |
| [ ] | `student.courses.lessonView.langNepali` | Nepali | नेपाली |
| [ ] | `student.courses.lessonView.loading` | Loading lesson… | पाठ लोड हुँदैछ… |
| [ ] | `student.courses.lessonView.materialDownload` | Download Resource | स्रोत डाउनलोड गर्नुहोस् |
| [ ] | `student.courses.lessonView.materialsTitle` | Lesson Materials | पाठ सामग्रीहरू |
| [ ] | `student.courses.lessonView.noTextContent` | No text content available for this lesson. | यस पाठको लागि कुनै पाठ सामग्री उपलब्ध छैन। |
| [ ] | `student.courses.lessonView.notFound` | Lesson not found | पाठ फेला परेन |
| [ ] | `student.courses.lessonView.progressComplete` | {pct}% Complete | {pct}% सम्पन्न |
| [ ] | `student.courses.lessonView.toastCourseEnd` | Congratulations! You've reached the end of the available content. | बधाई छ! उपलब्ध सामग्रीको अन्त्यमा पुग्नुभयो। |
| [ ] | `student.courses.lessonView.toastGenerateAIFail` | Failed to generate AI notes. | AI नोट बनाउन असफल भयो। |
| [ ] | `student.courses.lessonView.toastLoadFail` | Failed to load lesson content | पाठ सामग्री लोड गर्न असफल भयो |
| [ ] | `student.courses.lessonView.toastMarkedComplete` | Lesson marked complete! | पाठ सम्पन्न चिन्ह लगाइयो! |
| [ ] | `student.courses.lessonView.toastMarkedIncomplete` | Marked as incomplete | अपूर्ण चिन्ह लगाइयो |
| [ ] | `student.courses.lessonView.toastUpdateFail` | Failed to update progress | प्रगति अद्यावधिक गर्न असफल भयो |
| [ ] | `student.courses.lessons` | {count} Lessons | {count} पाठहरू |
| [ ] | `student.courses.loadingCourses` | Loading your courses… | तपाईंका विषयहरू लोड हुँदैछ… |
| [ ] | `student.courses.noCoursesHint` | Check back after enrollment is complete. | भर्ना सम्पन्न भएपछि फेरि जाँच गर्नुहोस्। |
| [ ] | `student.courses.noCoursesTitle` | No courses yet | अहिलेसम्म कुनै विषय छैन |
| [ ] | `student.courses.pageTitle` | My Courses | मेरा विषयहरू |
| [ ] | `student.courses.statActive` | Active | सक्रिय |
| [ ] | `student.courses.statDone` | Done | सम्पन्न |
| [ ] | `student.courses.statNotStarted` | Not Started | सुरु भएको छैन |
| [ ] | `student.courses.subjectsThisTerm` | {count} subject this term | यस सत्रमा {count} विषय |
| [ ] | `student.courses.subjectsThisTermPlural` | {count} subjects this term | यस सत्रमा {count} विषयहरू |

## `student.dashboard`

| ✓ | Key | English | नेपाली |
| --- | --- | --- | --- |
| [ ] | `student.dashboard.actionNeeded` | Action needed | कारवाही आवश्यक |
| [ ] | `student.dashboard.aiStudyPicks` | AI Study Picks | AI अध्ययन सुझावहरू |
| [ ] | `student.dashboard.aiTutorTagline` | Your AI Tutor explains complex topics instantly. | तपाईंको AI शिक्षकले जटिल विषयहरू तुरुन्तै बुझाउँछ। |
| [ ] | `student.dashboard.allDone` | ✓ All done! | ✓ सबै सकियो! |
| [ ] | `student.dashboard.allNotices` | All | सबै |
| [ ] | `student.dashboard.askAiTutor` | Ask AI Tutor | AI शिक्षकसँग सोध्नुहोस् |
| [ ] | `student.dashboard.attendanceRate` | Attendance Rate | उपस्थिति दर |
| [ ] | `student.dashboard.backToLogin` | Back to Login | लगइनमा फर्कनुहोस् |
| [ ] | `student.dashboard.badge` | Student Dashboard | विद्यार्थी ड्यासबोर्ड |
| [ ] | `student.dashboard.completedCount` | {count} completed | {count} सम्पन्न |
| [ ] | `student.dashboard.doneCount` | {count} done | {count} सकियो |
| [ ] | `student.dashboard.enrolledCourses` | Enrolled Courses | भर्ना भएका विषयहरू |
| [ ] | `student.dashboard.errorLoadFailed` | Failed to load dashboard data. | ड्यासबोर्ड डेटा लोड गर्न असफल भयो। |
| [ ] | `student.dashboard.errorProfileNotFound` | Student profile not found. Are you logged in as a student? | विद्यार्थी प्रोफाइल फेला परेन। के तपाईं विद्यार्थीको रूपमा लगइन गर्नुभएको छ? |
| [ ] | `student.dashboard.errorTitle` | Dashboard Error | ड्यासबोर्ड त्रुटि |
| [ ] | `student.dashboard.feeCollection` | Fee Collection | शुल्क संकलन |
| [ ] | `student.dashboard.fullSchedule` | Full Schedule | पूर्ण तालिका |
| [ ] | `student.dashboard.greetingGeneric` | Welcome Back! 👋 | स्वागत छ! 👋 |
| [ ] | `student.dashboard.greetingNamed` | Hey, {name}! 👋 | नमस्ते, {name}! 👋 |
| [ ] | `student.dashboard.loadingDashboard` | Loading your dashboard… | ड्यासबोर्ड लोड हुँदैछ… |
| [ ] | `student.dashboard.myCourses` | My Courses | मेरा विषयहरू |
| [ ] | `student.dashboard.needHelp` | Need Help? | सहायता चाहिन्छ? |
| [ ] | `student.dashboard.noActiveNotices` | No active notices. | कुनै सक्रिय सूचना छैन। |
| [ ] | `student.dashboard.noClassesToday` | No classes scheduled for today. | आज कुनै कक्षा तोकिएको छैन। |
| [ ] | `student.dashboard.noCoursesAssigned` | No courses assigned yet. | अहिलेसम्म कुनै विषय तोकिएको छैन। |
| [ ] | `student.dashboard.noticeBoard` | Notice Board | सूचना पाटी |
| [ ] | `student.dashboard.pendingTasks` | Pending Tasks | बाँकी कार्यहरू |
| [ ] | `student.dashboard.quizzesAndTests` | Quizzes & Tests | क्विज र परीक्षाहरू |
| [ ] | `student.dashboard.recentActivity` | Recent Activity | हालैका गतिविधि |
| [ ] | `student.dashboard.seeAll` | See All | सबै हेर्नुहोस् |
| [ ] | `student.dashboard.startChat` | Start Chat | कुराकानी सुरु गर्नुहोस् |
| [ ] | `student.dashboard.statAttendance` | {rate}% Attendance | {rate}% उपस्थिति |
| [ ] | `student.dashboard.statCoursesProgress` | {completed}/{total} Courses | {completed}/{total} विषयहरू |
| [ ] | `student.dashboard.statPending` | {count} Pending | {count} बाँकी |
| [ ] | `student.dashboard.subjectsEnrolled` | {count} subjects enrolled this term | यस सत्रमा {count} विषयहरूमा भर्ना |
| [ ] | `student.dashboard.title` | Dashboard | ड्यासबोर्ड |
| [ ] | `student.dashboard.todaysSchedule` | Today's Schedule | आजको तालिका |
| [ ] | `student.dashboard.upcomingExams` | Upcoming Exams | आगामी परीक्षाहरू |

## `student.exams`

| ✓ | Key | English | नेपाली |
| --- | --- | --- | --- |
| [ ] | `student.exams.candidateDetails` | Candidate Details | उम्मेदवारको विवरण |
| [ ] | `student.exams.downloadTicket` | Download Ticket | टिकट डाउनलोड गर्नुहोस् |
| [ ] | `student.exams.downloading` | Downloading... | डाउनलोड हुँदैछ... |
| [ ] | `student.exams.errorLoadExams` | Failed to load your exam schedule | परीक्षा तालिका लोड गर्न असफल भयो |
| [ ] | `student.exams.examCenter` | Exam Center | परीक्षा केन्द्र |
| [ ] | `student.exams.examCenterDefault` | Main Building | मुख्य भवन |
| [ ] | `student.exams.examDate` | Exam Date | परीक्षा मिति |
| [ ] | `student.exams.instructions` | Instructions | निर्देशनहरू |
| [ ] | `student.exams.loadingExams` | Loading your exam schedule... | परीक्षा तालिका लोड हुँदैछ... |
| [ ] | `student.exams.noTicketsHint` | Your hall tickets will appear here once they are generated by the school administration. | विद्यालय प्रशासनले तयार गरेपछि यहाँ देखिनेछ। |
| [ ] | `student.exams.noTicketsTitle` | No Hall Tickets Yet | अहिलेसम्म कुनै प्रवेशपत्र छैन |
| [ ] | `student.exams.notScheduled` | Not Scheduled | तोकिएको छैन |
| [ ] | `student.exams.pageTitle` | Exams & Hall Tickets | परीक्षा र प्रवेशपत्रहरू |
| [ ] | `student.exams.printAll` | Print All Tickets | सबै टिकट प्रिन्ट गर्नुहोस् |
| [ ] | `student.exams.room` | Room | कोठा |
| [ ] | `student.exams.seat` | Seat | सिट |
| [ ] | `student.exams.sectionLabel` | Exams | परीक्षाहरू |
| [ ] | `student.exams.startTime` | Start Time | सुरु समय |
| [ ] | `student.exams.startTimeTbd` | TBD | पछि तोकिनेछ |
| [ ] | `student.exams.studentId` | ID: {id} | ID: {id} |
| [ ] | `student.exams.subtitle` | View your exam schedule and seating arrangements | तपाईंको परीक्षा तालिका र सिट व्यवस्था हेर्नुहोस् |
| [ ] | `student.exams.ticketDownloadFailed` | Failed to download hall ticket | प्रवेशपत्र डाउनलोड गर्न असफल भयो |
| [ ] | `student.exams.ticketDownloaded` | Hall ticket downloaded successfully! | प्रवेशपत्र सफलतापूर्वक डाउनलोड भयो! |

## `student.fees`

| ✓ | Key | English | नेपाली |
| --- | --- | --- | --- |
| [ ] | `student.fees.allCleared` | ✓ All cleared! | ✓ सबै चुक्ता! |
| [ ] | `student.fees.alreadyPaid` | Already Paid: | पहिलै भुक्तानी: |
| [ ] | `student.fees.clearedSuccessfully` | Cleared successfully | सफलतापूर्वक चुक्ता |
| [ ] | `student.fees.colAction` | Action | कार्य |
| [ ] | `student.fees.colAmount` | Amount | रकम |
| [ ] | `student.fees.colDate` | Date | मिति |
| [ ] | `student.fees.colDueDate` | Due Date | भुक्तानी मिति |
| [ ] | `student.fees.colFeeStructure` | Fee Structure | शुल्क संरचना |
| [ ] | `student.fees.colMethod` | Method | माध्यम |
| [ ] | `student.fees.colPaid` | Paid | भुक्तानी |
| [ ] | `student.fees.colReceipt` | Receipt | रसिद |
| [ ] | `student.fees.colStatus` | Status | स्थिति |
| [ ] | `student.fees.colTransaction` | Transaction Details | कारोबार विवरण |
| [ ] | `student.fees.confirmPay` | Confirm & Pay | पुष्टि गरी तिर्नुहोस् |
| [ ] | `student.fees.dialogDesc` | Confirm payment for {feeName}. | {feeName} को भुक्तानी पुष्टि गर्नुहोस्। |
| [ ] | `student.fees.dialogTitle` | Secure Checkout | सुरक्षित भुक्तानी |
| [ ] | `student.fees.download` | Download | डाउनलोड |
| [ ] | `student.fees.feeAmount` | Fee Amount: | शुल्क रकम: |
| [ ] | `student.fees.invoiceId` | Invoice ID: {id} | बिल नं: {id} |
| [ ] | `student.fees.invoicesTitle` | Invoices & Fees | बिल र शुल्कहरू |
| [ ] | `student.fees.lockedDesc` | Fee management and online payments are not enabled for your school portal. | शुल्क व्यवस्थापन र अनलाइन भुक्तानी तपाईंको विद्यालय पोर्टलमा सक्षम गरिएको छैन। |
| [ ] | `student.fees.lockedTitle` | Finance Module Locked | वित्त मोड्युल बन्द छ |
| [ ] | `student.fees.methodDigital` | Digital | डिजिटल |
| [ ] | `student.fees.methodManual` | Manual | म्यानुअल |
| [ ] | `student.fees.noFeeRecords` | No fee records found. | कुनै शुल्क रेकर्ड फेला परेन। |
| [ ] | `student.fees.noPaymentHistory` | No payment history available. | कुनै भुक्तानी इतिहास उपलब्ध छैन। |
| [ ] | `student.fees.outstanding` | Outstanding | बाँकी |
| [ ] | `student.fees.pageTitle` | Fees & Payments | शुल्क र भुक्तानी |
| [ ] | `student.fees.payNow` | Pay Now | अहिले तिर्नुहोस् |
| [ ] | `student.fees.paymentMethod` | Payment Method | भुक्तानी माध्यम |
| [ ] | `student.fees.paymentNote` | Your payment request will be recorded immediately and reflected in your fee ledger. | तपाईंको भुक्तानी अनुरोध तुरुन्तै रेकर्ड हुनेछ। |
| [ ] | `student.fees.paymentPending` | ⚠ Payment pending | ⚠ भुक्तानी बाँकी |
| [ ] | `student.fees.processing` | Processing... | प्रक्रिया हुँदैछ... |
| [ ] | `student.fees.recentPaymentsTitle` | Recent Payments | हालैका भुक्तानीहरू |
| [ ] | `student.fees.redirectNotice` | You will be redirected to {provider} to complete payment. | {provider} मा पुनःनिर्देशित गरिनेछ। |
| [ ] | `student.fees.sectionLabel` | Finance | वित्त |
| [ ] | `student.fees.settled` | {pct}% settled | {pct}% चुक्ता |
| [ ] | `student.fees.subtitle` | Manage your school fees and payment history. | तपाईंको विद्यालय शुल्क र भुक्तानी इतिहास व्यवस्थापन गर्नुहोस्। |
| [ ] | `student.fees.tabDues` | Outstanding Dues | बाँकी शुल्क |
| [ ] | `student.fees.tabHistory` | Payment History | भुक्तानी इतिहास |
| [ ] | `student.fees.totalFees` | Total Fees | जम्मा शुल्क |
| [ ] | `student.fees.totalPaid` | Total Paid | जम्मा भुक्तानी |
| [ ] | `student.fees.totalToPay` | Total to Pay: | तिर्नुपर्ने कुल: |

## `student.grades`

| ✓ | Key | English | नेपाली |
| --- | --- | --- | --- |
| [ ] | `student.grades.academicRecords` | Academic Records | शैक्षिक रेकर्डहरू |
| [ ] | `student.grades.assessmentFallback` | Assessment {id} | मूल्याङ्कन {id} |
| [ ] | `student.grades.averageGrade` | Average Grade | औसत ग्रेड |
| [ ] | `student.grades.currentPerformance` | CURRENT PERFORMANCE | हालको प्रदर्शन |
| [ ] | `student.grades.growthInsight` | Growth Insight | वृद्धि अन्तर्दृष्टि |
| [ ] | `student.grades.growthInsightText` | Your strongest area is {subject}. Maintain momentum while building weaker areas. | तपाईंको सबभन्दा बलियो क्षेत्र {subject} हो। कमजोर क्षेत्रहरू निर्माण गर्दै गति कायम राख्नुहोस्। |
| [ ] | `student.grades.keepPushing` | Keep pushing! | अगाडि बढ्नुहोस्! |
| [ ] | `student.grades.loading` | Loading your academic records… | तपाईंका शैक्षिक रेकर्डहरू लोड हुँदैछ… |
| [ ] | `student.grades.noMasteryData` | No mastery data yet. | अहिलेसम्म कुनै दक्षता डेटा छैन। |
| [ ] | `student.grades.noResultsYet` | No results published yet. | अहिलेसम्म कुनै परिणाम प्रकाशित भएको छैन। |
| [ ] | `student.grades.pageTitle` | My Grades | मेरा अङ्कहरू |
| [ ] | `student.grades.passed` | PASSED | उत्तीर्ण |
| [ ] | `student.grades.passedCount` | {count} passed | {count} उत्तीर्ण |
| [ ] | `student.grades.recentAssessments` | Recent Assessments | हालैका मूल्याङ्कनहरू |
| [ ] | `student.grades.retry` | RETRY | पुनः प्रयास |
| [ ] | `student.grades.strongestArea` | Strongest area | सबभन्दा बलियो क्षेत्र |
| [ ] | `student.grades.subjectMastery` | Subject Mastery | विषय दक्षता |
| [ ] | `student.grades.subtitle` | Tracking your growth, one assessment at a time. | एक-एक मूल्याङ्कनमा तपाईंको प्रगति ट्र्याक गर्दै। |
| [ ] | `student.grades.topMastery` | Top Mastery | शीर्ष दक्षता |
| [ ] | `student.grades.topicProgress` | Topic Progress | विषय प्रगति |
| [ ] | `student.grades.totalAssessed` | Total Assessed | जम्मा मूल्याङ्कन |
| [ ] | `student.grades.viewAssessments` | View Assessments | मूल्याङ्कनहरू हेर्नुहोस् |
| [ ] | `student.grades.viewLearningPlan` | View Learning Plan | सिकाइ योजना हेर्नुहोस् |
| [ ] | `student.grades.xpEarned` | XP Earned | XP कमाइएको |

## `student.leaderboard`

| ✓ | Key | English | नेपाली |
| --- | --- | --- | --- |
| [ ] | `student.leaderboard.badgeYou` | You | तपाईं |
| [ ] | `student.leaderboard.badgesCount` | {count} badges | {count} ब्याजहरू |
| [ ] | `student.leaderboard.levelPrefix` | Lvl {level} | स्तर {level} |
| [ ] | `student.leaderboard.loading` | Loading rankings... | रैंकिङ लोड हुँदैछ... |
| [ ] | `student.leaderboard.myRankLabel` | Your Rank | तपाईंको स्थान |
| [ ] | `student.leaderboard.noEntries` | No active students found yet. Be the first to earn XP! | अहिलेसम्म कुनै सक्रिय विद्यार्थी फेला परेन। XP कमाउने पहिलो बन्नुहोस्! |
| [ ] | `student.leaderboard.pageTitle` | Leaderboard | लिडरबोर्ड |
| [ ] | `student.leaderboard.streakSuffix` | {days}d streak | {days} दिन लगातार |
| [ ] | `student.leaderboard.subtitleData` | {total} participants | {total} सहभागीहरू |
| [ ] | `student.leaderboard.subtitleDefault` | See who's leading the learning journey! | सिकाइ यात्रामा को अगाडि छ हेर्नुहोस्! |
| [ ] | `student.leaderboard.subtitleRank` | {total} participants · Your rank: #{rank} | {total} सहभागीहरू · तपाईंको स्थान: #{rank} |
| [ ] | `student.leaderboard.tabClass` | Class | कक्षा |
| [ ] | `student.leaderboard.tabSchool` | School | विद्यालय |
| [ ] | `student.leaderboard.xpLabel` | XP | XP |

## `student.learningPath`

| ✓ | Key | English | नेपाली |
| --- | --- | --- | --- |
| [ ] | `student.learningPath.badgePersonalized` | Personalized for You | तपाईंका लागि व्यक्तिगत |
| [ ] | `student.learningPath.badgeRecent` | Recent | हालैको |
| [ ] | `student.learningPath.btnDone` | Done | सम्पन्न |
| [ ] | `student.learningPath.btnGoToLesson` | Go to Lesson | पाठमा जानुहोस् |
| [ ] | `student.learningPath.btnLocked` | Locked | बन्द |
| [ ] | `student.learningPath.btnMarkComplete` | Mark Complete | सम्पन्न चिन्ह लगाउनुहोस् |
| [ ] | `student.learningPath.estMins` | {mins} mins | {mins} मिनेट |
| [ ] | `student.learningPath.getStarted` | Get Started | सुरु गर्नुहोस् |
| [ ] | `student.learningPath.loading` | Loading your learning path... | तपाईंको सिकाइ मार्ग लोड हुँदैछ... |
| [ ] | `student.learningPath.lockedDesc` | AI-powered personalized learning paths are not enabled for your school portal. | AI-संचालित व्यक्तिगत सिकाइ मार्ग तपाईंको विद्यालय पोर्टलमा सक्षम गरिएको छैन। |
| [ ] | `student.learningPath.lockedTitle` | AI Learning Locked | AI सिकाइ बन्द छ |
| [ ] | `student.learningPath.noPathDesc` | Let AI analyze your recent performance and create a custom learning roadmap for you. | AI ले तपाईंको हालैको प्रदर्शन विश्लेषण गरेर अनुकूलित सिकाइ रोडम्याप बनाउन दिनुहोस्। |
| [ ] | `student.learningPath.noPathTitle` | No Active Path | कुनै सक्रिय मार्ग छैन |
| [ ] | `student.learningPath.pageTitle` | AI Learning Path | AI सिकाइ मार्ग |
| [ ] | `student.learningPath.progressLabel` | Progress | प्रगति |
| [ ] | `student.learningPath.regenerate` | Regenerate My Path | मेरो मार्ग पुनः बनाउनुहोस् |
| [ ] | `student.learningPath.regenerating` | Regenerating… | बनाउँदैछ… |
| [ ] | `student.learningPath.startHere` | Start Here | यहाँबाट सुरु गर्नुहोस् |
| [ ] | `student.learningPath.subtitle` | Your personalized roadmap for academic mastery. | शैक्षिक दक्षताका लागि तपाईंको व्यक्तिगत रोडम्याप। |
| [ ] | `student.learningPath.toastCompleteAll` | Path completed! Great job. | मार्ग सम्पन्न! राम्रो काम। |
| [ ] | `student.learningPath.toastCompleteUnlocked` | Task completed! Next step unlocked. | कार्य सम्पन्न! अर्को चरण खुल्यो। |
| [ ] | `student.learningPath.toastGenerateFail` | Failed to generate path. | मार्ग बनाउन असफल भयो। |
| [ ] | `student.learningPath.toastGenerateSuccess` | New learning path generated! | नयाँ सिकाइ मार्ग तयार भयो! |
| [ ] | `student.learningPath.toastLoadFail` | Failed to load learning path. | सिकाइ मार्ग लोड गर्न असफल भयो। |
| [ ] | `student.learningPath.toastUpdateFail` | Failed to update status. | स्थिति अद्यावधिक गर्न असफल भयो। |

## `student.leaves`

| ✓ | Key | English | नेपाली |
| --- | --- | --- | --- |
| [ ] | `student.leaves.applyButton` | Apply for Leave | बिदाको लागि आवेदन गर्नुहोस् |
| [ ] | `student.leaves.cancelButton` | Cancel | रद्द गर्नुहोस् |
| [ ] | `student.leaves.colAction` | Action | कार्य |
| [ ] | `student.leaves.colDateRange` | Date Range | मिति दायरा |
| [ ] | `student.leaves.colDays` | Days | दिनहरू |
| [ ] | `student.leaves.colReason` | Reason | कारण |
| [ ] | `student.leaves.colRemarks` | Remarks | टिप्पणी |
| [ ] | `student.leaves.colReviewedBy` | Reviewed By | समीक्षकर्ता |
| [ ] | `student.leaves.colStatus` | Status | स्थिति |
| [ ] | `student.leaves.colType` | Type | प्रकार |
| [ ] | `student.leaves.dialogDesc` | Fill in the details below to submit your leave application. | बिदा आवेदन पेश गर्न तलको विवरण भर्नुहोस्। |
| [ ] | `student.leaves.docUrlHint` | Link to a supporting document (medical certificate, etc.) | सहायक कागजातको लिंक (स्वास्थ्य प्रमाणपत्र, आदि) |
| [ ] | `student.leaves.errorCancel` | Failed to cancel leave request | बिदा अनुरोध रद्द गर्न असफल भयो |
| [ ] | `student.leaves.errorEndDate` | End date must be on or after start date | अन्त्य मिति सुरु मितिभन्दा पहिले हुन सक्दैन |
| [ ] | `student.leaves.errorLoad` | Failed to load leave data | बिदा डेटा लोड गर्न असफल भयो |
| [ ] | `student.leaves.errorProfileNotLoaded` | Student profile not loaded | विद्यार्थी प्रोफाइल लोड भएको छैन |
| [ ] | `student.leaves.errorRequiredFields` | Please fill in all required fields | कृपया सबै अनिवार्य फिल्डहरू भर्नुहोस् |
| [ ] | `student.leaves.errorSubmit` | Failed to submit leave application | बिदा आवेदन पेश गर्न असफल भयो |
| [ ] | `student.leaves.labelDocUrl` | Document URL (optional) | कागजात URL (ऐच्छिक) |
| [ ] | `student.leaves.labelEndDate` | End Date | अन्त्य मिति |
| [ ] | `student.leaves.labelLeaveType` | Leave Type | बिदाको प्रकार |
| [ ] | `student.leaves.labelReason` | Reason | कारण |
| [ ] | `student.leaves.labelStartDate` | Start Date | सुरु मिति |
| [ ] | `student.leaves.leaveHistory` | Leave History | बिदा इतिहास |
| [ ] | `student.leaves.noLeaves` | No leave applications yet | अहिलेसम्म कुनै बिदा आवेदन छैन |
| [ ] | `student.leaves.noLeavesHint` | Click "Apply for Leave" to submit your first request. | पहिलो आवेदन पेश गर्न "बिदाको लागि आवेदन गर्नुहोस्" क्लिक गर्नुहोस्। |
| [ ] | `student.leaves.pageTitle` | My Leaves | मेरा बिदाहरू |
| [ ] | `student.leaves.placeholderReason` | Briefly describe the reason for your leave... | बिदाको कारण संक्षेपमा लेख्नुहोस्... |
| [ ] | `student.leaves.statApproved` | Approved | स्वीकृत |
| [ ] | `student.leaves.statPending` | Pending | बाँकी |
| [ ] | `student.leaves.statRejected` | Rejected | अस्वीकृत |
| [ ] | `student.leaves.statTotal` | Total Applied | जम्मा आवेदन |
| [ ] | `student.leaves.submitApplication` | Submit Application | आवेदन पेश गर्नुहोस् |
| [ ] | `student.leaves.submitting` | Submitting... | पेश हुँदैछ... |
| [ ] | `student.leaves.subtitle` | Apply for leave and track your applications | बिदाको लागि आवेदन गर्नुहोस् र तपाईंका आवेदनहरू ट्र्याक गर्नुहोस् |
| [ ] | `student.leaves.successCancelled` | Leave request cancelled | बिदा अनुरोध रद्द गरियो |
| [ ] | `student.leaves.successSubmitted` | Leave application submitted successfully | बिदा आवेदन सफलतापूर्वक पेश भयो |

## `student.library`

| ✓ | Key | English | नेपाली |
| --- | --- | --- | --- |
| [ ] | `student.library.allCategories` | All Categories | सबै श्रेणीहरू |
| [ ] | `student.library.available` | {available} / {total} available | {available} / {total} उपलब्ध |
| [ ] | `student.library.copies` | {count} copies | {count} प्रति |
| [ ] | `student.library.detailsButton` | Details | विवरण |
| [ ] | `student.library.due` | Due: {date} | फिर्ता मिति: {date} |
| [ ] | `student.library.issueBook` | Issue Book | पुस्तक जारी गर्नुहोस् |
| [ ] | `student.library.labelAvailability` | Availability: | उपलब्धता: |
| [ ] | `student.library.labelCategory` | Category: | श्रेणी: |
| [ ] | `student.library.labelIsbn` | ISBN: | ISBN: |
| [ ] | `student.library.labelPublisher` | Publisher: | प्रकाशक: |
| [ ] | `student.library.late` | Late | ढिलो |
| [ ] | `student.library.loading` | Loading library... | पुस्तकालय लोड हुँदैछ... |
| [ ] | `student.library.myCurrentBooks` | My Current Books | मेरा हालका पुस्तकहरू |
| [ ] | `student.library.noBooksFound` | No books found matching your criteria. | तपाईंको मापदण्डसँग मेल खाने कुनै पुस्तक फेला परेन। |
| [ ] | `student.library.noDescription` | No description available. | कुनै विवरण उपलब्ध छैन। |
| [ ] | `student.library.notAvailable` | Not Available | उपलब्ध छैन |
| [ ] | `student.library.outOfStock` | Out of Stock | स्टक सकियो |
| [ ] | `student.library.pageTitle` | Library | पुस्तकालय |
| [ ] | `student.library.processing` | Processing... | प्रक्रिया हुँदैछ... |
| [ ] | `student.library.searchPlaceholder` | Search by title, author... | शीर्षक, लेखकद्वारा खोज्नुहोस्... |
| [ ] | `student.library.subtitle` | Browse, borrow, and read books from the school collection | विद्यालयको संग्रहबाट पुस्तकहरू ब्राउज, उधारो र पढ्नुहोस् |

## `student.messages`

| ✓ | Key | English | नेपाली |
| --- | --- | --- | --- |
| [ ] | `student.messages.askAi` | Ask AI about this | यसबारे AI लाई सोध्नुहोस् |
| [ ] | `student.messages.createGroup` | Create Group Chat | समूह च्याट बनाउनुहोस् |
| [ ] | `student.messages.createGroupButton` | Create Group | समूह बनाउनुहोस् |
| [ ] | `student.messages.createGroupDesc` | Select participants and give your group a name. | सहभागीहरू छान्नुहोस् र समूहलाई नाम दिनुहोस्। |
| [ ] | `student.messages.directMessage` | Direct Message | प्रत्यक्ष सन्देश |
| [ ] | `student.messages.groupNameLabel` | Group Name | समूहको नाम |
| [ ] | `student.messages.groupNamePlaceholder` | e.g. Science Project | जस्तै: विज्ञान परियोजना |
| [ ] | `student.messages.loading` | Loading Conversations... | कुराकानीहरू लोड हुँदैछ... |
| [ ] | `student.messages.noConversations` | No conversations found. | कुनै कुराकानी फेला परेन। |
| [ ] | `student.messages.noMessagesYet` | No messages yet | अहिलेसम्म कुनै सन्देश छैन |
| [ ] | `student.messages.online` | Online | अनलाइन |
| [ ] | `student.messages.pageTitle` | Messages | सन्देशहरू |
| [ ] | `student.messages.searchPlaceholder` | Search chats... | च्याट खोज्नुहोस्... |
| [ ] | `student.messages.selectConversationDesc` | Choose a chat from the sidebar to start messaging your teachers or parents. | तपाईंका शिक्षक वा अभिभावकसँग सन्देश गर्न साइडबारबाट च्याट छान्नुहोस्। |
| [ ] | `student.messages.selectConversationTitle` | Select a Conversation | कुराकानी छान्नुहोस् |
| [ ] | `student.messages.selectParticipants` | Select Participants | सहभागीहरू छान्नुहोस् |
| [ ] | `student.messages.typeMessageDirect` | Type your message... | तपाईंको सन्देश टाइप गर्नुहोस्... |
| [ ] | `student.messages.typeMessageGroup` | Type message... (use @ai for bot) | सन्देश टाइप गर्नुहोस्... (बोट का लागि @ai प्रयोग गर्नुहोस्) |

## `student.myInfo`

| ✓ | Key | English | नेपाली |
| --- | --- | --- | --- |
| [ ] | `student.myInfo.hostelBadgeActive` | Active | सक्रिय |
| [ ] | `student.myInfo.hostelCurrentResident` | Current resident | हालको बासिन्दा |
| [ ] | `student.myInfo.hostelEmpty` | No hostel allotment found. | कुनै छात्रावास आवंटन फेला परेन। |
| [ ] | `student.myInfo.hostelEmptyHint` | Contact administration if you expected one. | यदि तपाईंले अपेक्षा गर्नुभएको थियो भने प्रशासनलाई सम्पर्क गर्नुहोस्। |
| [ ] | `student.myInfo.hostelLabelBlock` | Block | ब्लक |
| [ ] | `student.myInfo.hostelLabelCheckIn` | Check-in Date | चेक-इन मिति |
| [ ] | `student.myInfo.hostelLabelCheckOut` | Check-out Date | चेक-आउट मिति |
| [ ] | `student.myInfo.hostelLabelRemarks` | Remarks | टिप्पणी |
| [ ] | `student.myInfo.hostelLabelRoom` | Room | कोठा |
| [ ] | `student.myInfo.hostelSubtitle` | Your current room allotment | तपाईंको हालको कोठा आवंटन |
| [ ] | `student.myInfo.hostelTitle` | Hostel Accommodation | छात्रावास व्यवस्था |
| [ ] | `student.myInfo.loadingError` | Failed to load info. | जानकारी लोड गर्न असफल भयो। |
| [ ] | `student.myInfo.pageTitle` | My Info | मेरो जानकारी |
| [ ] | `student.myInfo.sectionLabel` | Student Portal | विद्यार्थी पोर्टल |
| [ ] | `student.myInfo.subtitle` | Your hostel accommodation and transport assignment. | तपाईंको छात्रावास र यातायात व्यवस्था। |
| [ ] | `student.myInfo.transportBadgeActive` | Active | सक्रिय |
| [ ] | `student.myInfo.transportEmpty` | No transport assignment found. | कुनै यातायात व्यवस्था फेला परेन। |
| [ ] | `student.myInfo.transportEmptyHint` | Contact administration if you expected one. | यदि तपाईंले अपेक्षा गर्नुभएको थियो भने प्रशासनलाई सम्पर्क गर्नुहोस्। |
| [ ] | `student.myInfo.transportLabelActiveFrom` | Active From | सक्रिय मिति |
| [ ] | `student.myInfo.transportLabelMonthlyFee` | Monthly Fee | मासिक शुल्क |
| [ ] | `student.myInfo.transportLabelPickup` | Pickup Stop | पिकअप स्टप |
| [ ] | `student.myInfo.transportLabelRoute` | Route | रुट |
| [ ] | `student.myInfo.transportSubtitle` | Your bus route and pickup details | तपाईंको बस रुट र पिकअप विवरण |
| [ ] | `student.myInfo.transportTitle` | Transport Assignment | यातायात व्यवस्था |

## `student.nav`

| ✓ | Key | English | नेपाली |
| --- | --- | --- | --- |
| [ ] | `student.nav.assessments` | Assessments | मूल्याङ्कनहरू |
| [ ] | `student.nav.assignments` | Assignments | गृहकार्यहरू |
| [ ] | `student.nav.attendance` | Attendance | उपस्थिति |
| [ ] | `student.nav.courses` | Courses | विषयहरू |
| [ ] | `student.nav.dashboard` | Dashboard | ड्यासबोर्ड |
| [ ] | `student.nav.feesPayments` | Fees & Payments | शुल्क र भुक्तानी |
| [ ] | `student.nav.greetingAfternoon` | Good Afternoon | शुभ दिउँसो |
| [ ] | `student.nav.greetingEvening` | Good Evening | शुभ साँझ |
| [ ] | `student.nav.greetingMorning` | Good Morning | शुभ बिहानी |
| [ ] | `student.nav.groupAcademics` | Academics | शैक्षिक |
| [ ] | `student.nav.groupAccount` | Account | खाता |
| [ ] | `student.nav.groupCommunication` | Communication | सञ्चार |
| [ ] | `student.nav.groupFinanceLife` | Finance & Life | वित्त र जीवन |
| [ ] | `student.nav.groupOverview` | Overview | सिंहावलोकन |
| [ ] | `student.nav.groupSchedule` | Schedule | तालिका |
| [ ] | `student.nav.joinClass` | Join: {subject} | सहभागी हुनुहोस्: {subject} |
| [ ] | `student.nav.leaderboard` | Leaderboard | लिडरबोर्ड |
| [ ] | `student.nav.learningPath` | Learning Path | सिकाइ मार्ग |
| [ ] | `student.nav.leaveRequests` | Leave Requests | बिदा अनुरोधहरू |
| [ ] | `student.nav.library` | Library | पुस्तकालय |
| [ ] | `student.nav.messages` | Messages | सन्देशहरू |
| [ ] | `student.nav.myClasses` | My Classes | मेरा कक्षाहरू |
| [ ] | `student.nav.myGrades` | My Grades | मेरा अङ्कहरू |
| [ ] | `student.nav.myHostelBus` | My Hostel & Bus | मेरो छात्रावास र बस |
| [ ] | `student.nav.noLiveClass` | No Live Class | कुनै लाइभ कक्षा छैन |
| [ ] | `student.nav.notices` | Notices | सूचनाहरू |
| [ ] | `student.nav.offlineContent` | Offline Content | अफलाइन सामग्री |
| [ ] | `student.nav.offlineMode` | Offline Mode | अफलाइन मोड |
| [ ] | `student.nav.portal` | Portal | पोर्टल |
| [ ] | `student.nav.profile` | Profile | प्रोफाइल |
| [ ] | `student.nav.projects` | Projects | परियोजनाहरू |
| [ ] | `student.nav.quizzes` | Quizzes | क्विजहरू |
| [ ] | `student.nav.reportIssue` | Report Issue | समस्या रिपोर्ट गर्नुहोस् |
| [ ] | `student.nav.studentPortal` | Student Portal | विद्यार्थी पोर्टल |
| [ ] | `student.nav.studentRole` | Student | विद्यार्थी |
| [ ] | `student.nav.timetable` | Timetable | समय तालिका |

## `student.notices`

| ✓ | Key | English | नेपाली |
| --- | --- | --- | --- |
| [ ] | `student.notices.announcements` | Announcements | घोषणाहरू |
| [ ] | `student.notices.badgeUnread` | UNREAD | अपठित |
| [ ] | `student.notices.dateRecently` | Recently | भर्खरै |
| [ ] | `student.notices.filterAll` | All ({count}) | सबै ({count}) |
| [ ] | `student.notices.filterHigh` | High | उच्च |
| [ ] | `student.notices.filterLow` | Low | न्यून |
| [ ] | `student.notices.filterNormal` | Normal | सामान्य |
| [ ] | `student.notices.loading` | Loading notices… | सूचनाहरू लोड हुँदैछ… |
| [ ] | `student.notices.noNoticesAll` | You're all caught up! Check back later. | तपाईं सबै देख्नुभएको छ! पछि फेरि जाँच गर्नुहोस्। |
| [ ] | `student.notices.noNoticesFiltered` | No {priority}-priority notices. Try a different filter. | कुनै {priority}-प्राथमिकता सूचना छैन। अर्को फिल्टर प्रयास गर्नुहोस्। |
| [ ] | `student.notices.noNoticesTitle` | No notices found | कुनै सूचना फेला परेन |
| [ ] | `student.notices.pageTitle` | Notice Board | सूचना पाटी |
| [ ] | `student.notices.prioritySuffix` | priority | प्राथमिकता |
| [ ] | `student.notices.subtitle` | Latest announcements from your school and teachers. | तपाईंको विद्यालय र शिक्षकहरूका नवीनतम घोषणाहरू। |
| [ ] | `student.notices.total` | {count} Total | {count} जम्मा |
| [ ] | `student.notices.unread` | {count} Unread | {count} अपठित |
| [ ] | `student.notices.urgent` | {count} Urgent | {count} अत्यावश्यक |
| [ ] | `student.notices.viewAttachment` | View Attachment | संलग्नक हेर्नुहोस् |

## `student.notifications`

| ✓ | Key | English | नेपाली |
| --- | --- | --- | --- |
| [ ] | `student.notifications.pageTitle` | Notifications History | सूचना इतिहास |

## `student.offline`

| ✓ | Key | English | नेपाली |
| --- | --- | --- | --- |
| [ ] | `student.offline.browseLessons` | Browse My Lessons | मेरा पाठहरू हेर्नुहोस् |
| [ ] | `student.offline.clearAllDownloads` | Clear All Downloads | सबै डाउनलोड हटाउनुहोस् |
| [ ] | `student.offline.connectToDownload` | Connect to internet to download content | सामग्री डाउनलोड गर्न इन्टरनेटमा जडान गर्नुहोस् |
| [ ] | `student.offline.downloadedItems` | Downloaded Items | डाउनलोड गरिएका वस्तुहरू |
| [ ] | `student.offline.emptyDesc` | Download lessons while online so you can study anytime — even without internet access. | अनलाइन हुँदा पाठहरू डाउनलोड गर्नुहोस् ताकि तपाईं जुनसुकै बेला — इन्टरनेट बिना पनि — पढ्न सक्नुहोस्। |
| [ ] | `student.offline.emptyTitle` | No Offline Content Yet | अहिलेसम्म कुनै अफलाइन सामग्री छैन |
| [ ] | `student.offline.itemsCount` | {count} items | {count} वस्तुहरू |
| [ ] | `student.offline.noContent` | Lesson content will appear here when available offline. | अफलाइन उपलब्ध हुँदा पाठको सामग्री यहाँ देखिनेछ। |
| [ ] | `student.offline.openPdf` | Open PDF Material | PDF सामग्री खोल्नुहोस् |
| [ ] | `student.offline.pageTitle` | Offline Content | अफलाइन सामग्री |
| [ ] | `student.offline.removeOffline` | Remove from Offline | अफलाइनबाट हटाउनुहोस् |
| [ ] | `student.offline.savedBadge` | ✓ Saved | ✓ सुरक्षित |
| [ ] | `student.offline.slowConnection` | Slow connection detected | ढिलो जडान पत्ता लाग्यो |
| [ ] | `student.offline.slowConnectionDesc` | Use downloaded content to save data and study faster. | डेटा बचाउन र छिटो पढ्न डाउनलोड गरिएको सामग्री प्रयोग गर्नुहोस्। |
| [ ] | `student.offline.spaceUsed` | Space Used | प्रयोग गरिएको ठाउँ |
| [ ] | `student.offline.statusOffline` | Offline | अफलाइन |
| [ ] | `student.offline.statusOnline` | Online | अनलाइन |
| [ ] | `student.offline.storageInfo` | Storage Info | भण्डारण जानकारी |
| [ ] | `student.offline.storageStatus` | Status | स्थिति |
| [ ] | `student.offline.studyTipsTitle` | 📱 Study Tips for Rural Areas | 📱 ग्रामीण क्षेत्रका लागि अध्ययन सुझावहरू |
| [ ] | `student.offline.studyingOffline` | You're studying offline | तपाईं अफलाइन पढ्दैहुनुहुन्छ |
| [ ] | `student.offline.studyingOfflineDesc` | All content below is available without internet | तलका सबै सामग्री इन्टरनेट बिना उपलब्ध छन् |
| [ ] | `student.offline.tip1` | Download lessons when connected to Wi-Fi | Wi-Fi मा जडान हुँदा पाठहरू डाउनलोड गर्नुहोस् |
| [ ] | `student.offline.tip2` | Study downloaded content without internet | इन्टरनेट बिना डाउनलोड गरिएको सामग्री पढ्नुहोस् |
| [ ] | `student.offline.tip3` | Your progress syncs when back online | फेरि अनलाइन हुँदा तपाईंको प्रगति सिंक हुन्छ |
| [ ] | `student.offline.tip4` | Low-data mode reduces image quality | कम-डेटा मोडले छविको गुणस्तर घटाउँछ |
| [ ] | `student.offline.tip5` | Install this app on your phone for offline access | अफलाइन पहुँचका लागि यो एप आफ्नो फोनमा स्थापना गर्नुहोस् |
| [ ] | `student.offline.toastClearedAll` | All offline content cleared. | सबै अफलाइन सामग्री हटाइयो। |
| [ ] | `student.offline.toastRemoved` | "{title}" removed from offline storage. | "{title}" अफलाइन भण्डारणबाट हटाइयो। |

## `student.paymentResult`

| ✓ | Key | English | नेपाली |
| --- | --- | --- | --- |
| [ ] | `student.paymentResult.backToFees` | Back to Fees | शुल्कमा फर्कनुहोस् |
| [ ] | `student.paymentResult.failedDesc` | Your payment could not be completed. Please try again. | तपाईंको भुक्तानी पूरा हुन सकेन। कृपया फेरि प्रयास गर्नुहोस्। |
| [ ] | `student.paymentResult.failedTitle` | Payment Failed | भुक्तानी असफल भयो |
| [ ] | `student.paymentResult.successDesc` | Your payment via {gateway} has been processed. | {gateway} मार्फत तपाईंको भुक्तानी प्रक्रिया भयो। |
| [ ] | `student.paymentResult.successTitle` | Payment Successful! | भुक्तानी सफल भयो! |

## `student.profile`

| ✓ | Key | English | नेपाली |
| --- | --- | --- | --- |
| [ ] | `student.profile.pageTitle` | Your Profile | तपाईंको प्रोफाइल |
| [ ] | `student.profile.subtitle` | Manage your account settings and academic data | तपाईंको खाता सेटिङ र शैक्षिक डेटा व्यवस्थापन गर्नुहोस् |

## `student.projectDetail`

| ✓ | Key | English | नेपाली |
| --- | --- | --- | --- |
| [ ] | `student.projectDetail.ariaGoBack` | Go back | पछाडि जानुहोस् |
| [ ] | `student.projectDetail.btnPost` | Post | पोस्ट गर्नुहोस् |
| [ ] | `student.projectDetail.btnSubmitProject` | Submit project | परियोजना पेश गर्नुहोस् |
| [ ] | `student.projectDetail.labelDue` | Due {date} | म्याद {date} |
| [ ] | `student.projectDetail.labelFinalGrade` | Final grade: | अन्तिम ग्रेड: |
| [ ] | `student.projectDetail.labelMentor` | Mentor: {name} | सल्लाहकार: {name} |
| [ ] | `student.projectDetail.loading` | Loading… | लोड हुँदैछ… |
| [ ] | `student.projectDetail.loadingActivity` | Loading activity… | गतिविधि लोड हुँदैछ… |
| [ ] | `student.projectDetail.loadingTasks` | Loading tasks… | कार्यहरू लोड हुँदैछ… |
| [ ] | `student.projectDetail.notFound` | Project not found or you don't have access. | परियोजना फेला परेन वा तपाईंलाई पहुँच छैन। |
| [ ] | `student.projectDetail.placeholderComment` | Comment for the team… | टोलीका लागि टिप्पणी… |
| [ ] | `student.projectDetail.sectionActivity` | Activity | गतिविधि |
| [ ] | `student.projectDetail.sectionAllTasks` | All tasks | सबै कार्यहरू |
| [ ] | `student.projectDetail.sectionDescription` | Description | विवरण |
| [ ] | `student.projectDetail.sectionMyTasks` | My tasks | मेरा कार्यहरू |
| [ ] | `student.projectDetail.sectionProgress` | Progress | प्रगति |
| [ ] | `student.projectDetail.taskStatusBlocked` | Blocked | अवरुद्ध |
| [ ] | `student.projectDetail.taskStatusDone` | Done | सकियो |
| [ ] | `student.projectDetail.taskStatusInProgress` | In Progress | प्रक्रियामा |
| [ ] | `student.projectDetail.taskStatusReview` | Review | समीक्षा |
| [ ] | `student.projectDetail.taskStatusTodo` | To Do | गर्नु छ |
| [ ] | `student.projectDetail.toastCommentFailed` | Comment failed | टिप्पणी असफल भयो |
| [ ] | `student.projectDetail.toastProjectSubmitted` | Project submitted | परियोजना पेश भयो |
| [ ] | `student.projectDetail.toastSubmitFailed` | Submit failed | पेश असफल भयो |
| [ ] | `student.projectDetail.toastUpdateFailed` | Update failed | अद्यावधिक असफल भयो |

## `student.projectsList`

| ✓ | Key | English | नेपाली |
| --- | --- | --- | --- |
| [ ] | `student.projectsList.empty` | You haven't been assigned to any projects yet. | तपाईंलाई अहिलेसम्म कुनै परियोजनामा तोकिएको छैन। |
| [ ] | `student.projectsList.errorLoad` | Failed to load projects. | परियोजनाहरू लोड गर्न असफल भयो। |
| [ ] | `student.projectsList.labelDue` | Due {date} | म्याद {date} |
| [ ] | `student.projectsList.labelMentor` | Mentor: {name} | सल्लाहकार: {name} |
| [ ] | `student.projectsList.loading` | Loading… | लोड हुँदैछ… |
| [ ] | `student.projectsList.pageTitle` | My projects | मेरा परियोजनाहरू |
| [ ] | `student.projectsList.subtitle` | Group + individual projects you're working on. | तपाईं काम गरिरहनुभएका समूह + व्यक्तिगत परियोजनाहरू। |
| [ ] | `student.projectsList.taskCountPlural` | {count} tasks | {count} कार्यहरू |
| [ ] | `student.projectsList.taskCountSingular` | {count} task | {count} कार्य |

## `student.quizDetail`

| ✓ | Key | English | नेपाली |
| --- | --- | --- | --- |
| [ ] | `student.quizDetail.backToExams` | Back to Exams | परीक्षामा फर्कनुहोस् |
| [ ] | `student.quizDetail.btnNext` | Next | अर्को |
| [ ] | `student.quizDetail.btnPrevious` | Previous | अघिल्लो |
| [ ] | `student.quizDetail.btnSubmitQuiz` | Submit Quiz | क्विज पेश गर्नुहोस् |
| [ ] | `student.quizDetail.completedDesc` | You've completed the quiz: | तपाईंले क्विज सम्पन्न गर्नुभयो: |
| [ ] | `student.quizDetail.defaultDescription` | Welcome to this quiz. Please read the instructions carefully. | यस क्विजमा स्वागत छ। कृपया निर्देशनहरू ध्यानपूर्वक पढ्नुहोस्। |
| [ ] | `student.quizDetail.errorLoad` | Failed to load quiz | क्विज लोड गर्न असफल भयो |
| [ ] | `student.quizDetail.errorSubmit` | Failed to submit quiz | क्विज पेश गर्न असफल भयो |
| [ ] | `student.quizDetail.labelDuration` | Duration | अवधि |
| [ ] | `student.quizDetail.labelQuestions` | Questions | प्रश्नहरू |
| [ ] | `student.quizDetail.notFound` | Quiz not found | क्विज फेला परेन |
| [ ] | `student.quizDetail.placeholderAnswer` | Type your answer here... | यहाँ उत्तर टाइप गर्नुहोस्... |
| [ ] | `student.quizDetail.pointsSuffix` | Points | अङ्क |
| [ ] | `student.quizDetail.questionOf` | Question {current} of {total} | प्रश्न {current} / {total} |
| [ ] | `student.quizDetail.resultFail` | Keep Trying! | फेरि प्रयास गर्नुहोस्! |
| [ ] | `student.quizDetail.resultPass` | Congratulations! | बधाई छ! |
| [ ] | `student.quizDetail.startQuiz` | Start Quiz | क्विज सुरु गर्नुहोस् |
| [ ] | `student.quizDetail.submitting` | Submitting... | पेश हुँदैछ... |
| [ ] | `student.quizDetail.successSubmit` | Quiz submitted successfully! | क्विज सफलतापूर्वक पेश भयो! |
| [ ] | `student.quizDetail.suffixMins` | Mins | मिनेट |
| [ ] | `student.quizDetail.suffixTotal` | Total | जम्मा |
| [ ] | `student.quizDetail.totalScoreLabel` | Total Score Out Of {max} | {max} मध्ये कुल अङ्क |
| [ ] | `student.quizDetail.warningText` | Once you start, the timer will begin. Do not refresh the page or your progress may be lost. | सुरु गरेपछि टाइमर सुरु हुन्छ। पृष्ठ रिफ्रेस नगर्नुहोस् नत्र प्रगति हराउन सक्छ। |

## `student.quizzes`

| ✓ | Key | English | नेपाली |
| --- | --- | --- | --- |
| [ ] | `student.quizzes.count` | {count} quiz available. | {count} क्विज उपलब्ध। |
| [ ] | `student.quizzes.countPlural` | {count} quizzes available. | {count} क्विजहरू उपलब्ध। |
| [ ] | `student.quizzes.deadlinePassed` | Deadline Passed | समयसीमा सकियो |
| [ ] | `student.quizzes.due` | Due | समयसीमा |
| [ ] | `student.quizzes.errorLoad` | Failed to load quizzes | क्विजहरू लोड गर्न असफल भयो |
| [ ] | `student.quizzes.metaDuration` | Duration | अवधि |
| [ ] | `student.quizzes.metaDurationUnit` | min | मिनेट |
| [ ] | `student.quizzes.metaMarks` | Marks | अङ्क |
| [ ] | `student.quizzes.metaPass` | Pass | उत्तीर्ण |
| [ ] | `student.quizzes.noQuizzes` | No quizzes available yet. | अहिलेसम्म कुनै क्विज उपलब्ध छैन। |
| [ ] | `student.quizzes.noResults` | No quizzes match your search. | तपाईंको खोजसँग मेल खाने कुनै क्विज छैन। |
| [ ] | `student.quizzes.pageTitle` | Quizzes | क्विजहरू |
| [ ] | `student.quizzes.searchPlaceholder` | Search quizzes… | क्विजहरू खोज्नुहोस्… |
| [ ] | `student.quizzes.startQuiz` | Start Quiz | क्विज सुरु गर्नुहोस् |
| [ ] | `student.quizzes.statusAvailable` | Available | उपलब्ध |
| [ ] | `student.quizzes.statusOverdue` | Overdue | ढिलो |
| [ ] | `student.quizzes.statusUpcoming` | Upcoming | आगामी |
| [ ] | `student.quizzes.wasDue` | Was due | सकिएको थियो |

## `student.reports`

| ✓ | Key | English | नेपाली |
| --- | --- | --- | --- |
| [ ] | `student.reports.aiSummary` | AI Summary | AI सारांश |
| [ ] | `student.reports.areasToImprove` | Areas to Improve | सुधार गर्नुपर्ने क्षेत्रहरू |
| [ ] | `student.reports.areasToWatch` | Areas to Watch | ध्यान दिनुपर्ने क्षेत्रहरू |
| [ ] | `student.reports.cached` | Cached —  | क्यासमा —  |
| [ ] | `student.reports.generateReport` | Generate Report | रिपोर्ट बनाउनुहोस् |
| [ ] | `student.reports.generated` | Generated | बनाइएको |
| [ ] | `student.reports.generating` | Generating… | बनाउँदैछ… |
| [ ] | `student.reports.historyAuto` | Auto | स्वचालित |
| [ ] | `student.reports.historyHide` | Hide Report History | रिपोर्ट इतिहास लुकाउनुहोस् |
| [ ] | `student.reports.historyShow` | Show Report History | रिपोर्ट इतिहास देखाउनुहोस् |
| [ ] | `student.reports.howToHelpAtHome` | How to Help at Home | घरमा कसरी सहायता गर्ने |
| [ ] | `student.reports.keyConcerns` | Key Concerns | मुख्य चिन्ताहरू |
| [ ] | `student.reports.metaAiSessions` | AI Sessions | AI सत्रहरू |
| [ ] | `student.reports.metaAiTutorSessions` | {count} sessions | {count} सत्रहरू |
| [ ] | `student.reports.metaAiTutorUse` | AI Tutor Use | AI शिक्षक प्रयोग |
| [ ] | `student.reports.metaAttendance` | Attendance | उपस्थिति |
| [ ] | `student.reports.metaAvgScore` | Avg Score | औसत अङ्क |
| [ ] | `student.reports.metaPlanDone` | Plan Done | योजना सम्पन्न |
| [ ] | `student.reports.noPreviousReports` | No previous reports. | कुनै पुराना रिपोर्टहरू छैनन्। |
| [ ] | `student.reports.noReportHint` | Click "Generate Report" to create your AI-powered progress report. | AI-संचालित प्रगति रिपोर्ट बनाउन "रिपोर्ट बनाउनुहोस्" क्लिक गर्नुहोस्। |
| [ ] | `student.reports.noReportTitle` | No report yet | अहिलेसम्म कुनै रिपोर्ट छैन |
| [ ] | `student.reports.pageTitle` | AI Progress Report | AI प्रगति रिपोर्ट |
| [ ] | `student.reports.parentSummary` | Parent Summary | अभिभावक सारांश |
| [ ] | `student.reports.recommendedActions` | Recommended Actions | सिफारिस गरिएका कार्यहरू |
| [ ] | `student.reports.refreshTitle` | Refresh | ताजा गर्नुहोस् |
| [ ] | `student.reports.riskLevel` | Risk Level: | जोखिम स्तर: |
| [ ] | `student.reports.skillGaps` | Skill Gaps | सीप अन्तरहरू |
| [ ] | `student.reports.strengths` | Strengths | बलियो पक्षहरू |
| [ ] | `student.reports.subtitle` | Personalised weekly report combining scores, attendance, skill mastery, and AI tutor activity. | अङ्क, उपस्थिति, सीप दक्षता, र AI शिक्षक गतिविधि समेटिएको साप्ताहिक व्यक्तिगत रिपोर्ट। |
| [ ] | `student.reports.suggestedInterventions` | Suggested Interventions | सुझावित हस्तक्षेपहरू |
| [ ] | `student.reports.tabMyReport` | My Report | मेरो रिपोर्ट |
| [ ] | `student.reports.tabParentView` | Parent View | अभिभावक दृश्य |
| [ ] | `student.reports.tabTeacherView` | Teacher View | शिक्षक दृश्य |
| [ ] | `student.reports.toastGenerateFailed` | Failed to generate report. | रिपोर्ट बनाउन असफल भयो। |
| [ ] | `student.reports.toastGenerated` | Progress report generated. | प्रगति रिपोर्ट बनाइयो। |

## `student.resources`

| ✓ | Key | English | नेपाली |
| --- | --- | --- | --- |
| [ ] | `student.resources.back` | Back | फर्कनुहोस् |
| [ ] | `student.resources.cehrdModule` | CEHRD Module | CEHRD मोड्युल |
| [ ] | `student.resources.fullCurriculumLabel` | Full Grade {grade} Curriculum | कक्षा {grade} को पूर्ण पाठ्यक्रम |
| [ ] | `student.resources.govtPortalTitle` | Govt. Learning Portal | सरकारी सिकाइ पोर्टल |
| [ ] | `student.resources.gradeResources` | Grade {grade} Resources | कक्षा {grade} का स्रोतहरू |
| [ ] | `student.resources.loading` | Loading resources… | स्रोतहरू लोड हुँदैछ… |
| [ ] | `student.resources.openMaterial` | Open Official Material | आधिकारिक सामग्री खोल्नुहोस् |
| [ ] | `student.resources.subtitle` | Official open-source learning materials from the Center for Education and Human Resource Development (CEHRD). Select a subject to access video lessons and textbooks. | शिक्षा तथा मानव स्रोत विकास केन्द्र (CEHRD) बाट आधिकारिक मुक्त-स्रोत सिकाइ सामग्रीहरू। भिडियो पाठ र पाठ्यपुस्तकहरू पहुँच गर्न विषय छान्नुहोस्। |
| [ ] | `student.resources.visitMainSite` | Visit Main Website | मुख्य वेबसाइट भ्रमण गर्नुहोस् |
| [ ] | `student.resources.whyGovtDesc` | These materials are aligned with the national curriculum and include official video lectures, digital textbooks, and interactive exercises directly from the Ministry of Education. | यी सामग्रीहरू राष्ट्रिय पाठ्यक्रमसँग मिलाइएका छन् र शिक्षा मन्त्रालयबाट आधिकारिक भिडियो व्याख्यान, डिजिटल पाठ्यपुस्तक, र अन्तरक्रियात्मक अभ्यासहरू समावेश छन्। |
| [ ] | `student.resources.whyGovtTitle` | Why use the Government Portal? | सरकारी पोर्टल किन प्रयोग गर्ने? |

## `student.schedule`

| ✓ | Key | English | नेपाली |
| --- | --- | --- | --- |
| [ ] | `student.schedule.aiFoundTitle` | What the AI found for you | AI ले तपाईंका लागि के फेला पार्यो |
| [ ] | `student.schedule.dailyGoal` | Daily goal (min) | दैनिक लक्ष्य (मिनेट) |
| [ ] | `student.schedule.dayDone` | {completed}/{total} done | {completed}/{total} सकियो |
| [ ] | `student.schedule.dayToday` | Today | आज |
| [ ] | `student.schedule.dayTomorrow` | Tomorrow | भोलि |
| [ ] | `student.schedule.errorGenerateSchedule` | Failed to generate schedule. | तालिका बनाउन असफल भयो। |
| [ ] | `student.schedule.errorLoadSchedule` | Failed to load study schedule. | अध्ययन तालिका लोड गर्न असफल भयो। |
| [ ] | `student.schedule.errorUpdateStatus` | Failed to update status. | स्थिति अद्यावधिक गर्न असफल भयो। |
| [ ] | `student.schedule.generatePlan` | Generate AI Plan | AI योजना बनाउनुहोस् |
| [ ] | `student.schedule.generating` | Generating… | बनाउँदैछ… |
| [ ] | `student.schedule.loadingSchedule` | Loading study schedule… | अध्ययन तालिका लोड हुँदैछ… |
| [ ] | `student.schedule.markComplete` | Mark complete | सम्पन्न चिन्ह लगाउनुहोस् |
| [ ] | `student.schedule.markIncomplete` | Mark incomplete | अपूर्ण चिन्ह लगाउनुहोस् |
| [ ] | `student.schedule.minutesSuffix` | {min} min | {min} मिनेट |
| [ ] | `student.schedule.noScheduleHint` | Click "Generate AI Plan" and the AI will build a personalised schedule using your spaced reviews, skill gaps, and upcoming exams. | "AI योजना बनाउनुहोस्" क्लिक गर्नुहोस् र AI ले तपाईंको दोहोर्याइ, सीप अन्तर र परीक्षा प्रयोग गरेर व्यक्तिगत तालिका बनाउनेछ। |
| [ ] | `student.schedule.noScheduleTitle` | No study plan yet | अहिलेसम्म कुनै अध्ययन योजना छैन |
| [ ] | `student.schedule.pageTitle` | Smart Study Planner | स्मार्ट अध्ययन योजनाकार |
| [ ] | `student.schedule.planReady` | AI plan ready — {count} sessions over {days} days. | AI योजना तयार — {days} दिनमा {count} सत्रहरू। |
| [ ] | `student.schedule.refresh` | Refresh | ताजा गर्नुहोस् |
| [ ] | `student.schedule.reviewsDue` | Reviews due | समीक्षा बाँकी |
| [ ] | `student.schedule.sectionLabel` | AI Planner | AI योजनाकार |
| [ ] | `student.schedule.sessions` | {completed}/{total} sessions | {completed}/{total} सत्रहरू |
| [ ] | `student.schedule.skillGaps` | Skill gaps | सीप अन्तरहरू |
| [ ] | `student.schedule.subtitle` | AI-optimised schedule combining spaced repetition, skill gaps, and upcoming exams. | दोहोर्याइ, सीप अन्तर, र आगामी परीक्षा मिलाएर AI ले बनाएको तालिका। |
| [ ] | `student.schedule.topSkillGaps` | Top skill gaps | शीर्ष सीप अन्तरहरू |
| [ ] | `student.schedule.upcomingExams` | Upcoming exams | आगामी परीक्षाहरू |

## `student.timetable`

| ✓ | Key | English | नेपाली |
| --- | --- | --- | --- |
| [ ] | `student.timetable.colDay` | Day | दिन |
| [ ] | `student.timetable.colRoom` | Room | कोठा |
| [ ] | `student.timetable.colSubject` | Subject | विषय |
| [ ] | `student.timetable.colTeacher` | Teacher | शिक्षक |
| [ ] | `student.timetable.colTime` | Time | समय |
| [ ] | `student.timetable.colType` | Type | प्रकार |
| [ ] | `student.timetable.downloadPdf` | Download PDF | PDF डाउनलोड |
| [ ] | `student.timetable.noClasses` | No classes scheduled for {day}. | {day} का लागि कुनै कक्षा तोकिएको छैन। |
| [ ] | `student.timetable.pageTitle` | Class Timetable | कक्षा समय तालिका |
| [ ] | `student.timetable.pdfTitle` | Class Timetable | कक्षा समय तालिका |
| [ ] | `student.timetable.room` | Room {number} | कोठा {number} |
| [ ] | `student.timetable.subtitle` | Weekly class schedule | साप्ताहिक कक्षा तालिका |
| [ ] | `student.timetable.typeExtra` | Extra Class | अतिरिक्त कक्षा |
| [ ] | `student.timetable.typeExtraPdf` | Extra | अतिरिक्त |
| [ ] | `student.timetable.typeMain` | Main | मुख्य |
