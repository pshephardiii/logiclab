# Controlled assessment investigation

Status: future investigation agreed during local QA on October 27, 2026. Safe Exam Browser is the first candidate to evaluate; no integration, purchase, exam mode or delivery branch is approved or implemented by this note. Keep the current QA, audit and deployment work separate.

## Assessment boundary

LogicLab controls when an assignment reveals feedback and solutions. It cannot make the answer to a supplied propositional formula unavailable elsewhere. Students can recreate a graded formula in independent practice, use an external truth-table generator or write a solver. Independent practice remains available; instructor access to those private sessions would not reliably prevent this behavior.

Describe current graded work as supporting homework and formative assessment, not as a secure examination environment. The instructor's experience with supervised in-class logic exams motivates exploring controlled assessment conditions. Solution-release and authorization checks still matter and must remain authoritative.

## First candidate: Safe Exam Browser

[Safe Exam Browser (SEB)](https://safeexambrowser.org/about_overview_en.html) is an installed exam-browser/kiosk environment that restricts access to websites, applications and system functions. This provides controls beyond those available to an ordinary web page. The project publishes [assessment-system integration documentation](https://safeexambrowser.org/developer/seb-integration.html) and a [Config Key mechanism](https://safeexambrowser.org/developer/seb-config-key.html) for checking exam configuration.

Investigate a supervised classroom pilot first. Compatibility with LogicLab has not been demonstrated. Vendor documentation describes capabilities, not an independent assurance that every restriction is effective or that all devices are supported.

A feasibility slice should answer:

1. **Launch and configuration:** can an instructor launch a specific LogicLab exam with an appropriate SEB configuration, permitted URLs and supported client versions?
2. **Server enforcement:** how should LogicLab validate the documented configuration/client checks before granting access to exam content and submissions? Do not rely only on a browser name, User-Agent or client-side flag. Evaluate the protocol's trust assumptions and limitations.
3. **Existing workflows:** do authentication cookies, normal/demo isolation, assignment access, answer controls, save revisions and submission work in supported SEB clients? Define a dedicated exam policy rather than applying restrictions to every graded homework assignment.
4. **Interruptions and exit:** how do students recover saved work after a crash, connectivity loss or expired session? Define authorized exit/re-entry and instructor assistance before introducing restrictions; do not automatically submit or discard work on focus loss.
5. **Accessibility and support:** test keyboard navigation, assistive technology, accommodations, installation permissions and the actual institution's device/OS fleet. Decide what alternative assessment is available when a client cannot be used.
6. **Operations:** establish configuration ownership, updates, support burden and deployment requirements. Determine whether an institution's existing LMS integration is preferable to a standalone integration.
7. **Evidence and decision:** demonstrate a small synthetic exam, test expected restrictions and recovery, document remaining gaps, and estimate integration/support effort before approving implementation.

Even a restricted exam computer does not control a separate phone, another person or every external resource. Supervision and assessment design remain part of the model; avoid claims of cheating prevention guarantees.

## Other options and recent developments

- [Respondus LockDown Browser](https://support.respondus.com/hc/en-us/articles/4409607360539-LockDown-Browser-The-Student-Experience) is another installed restricted exam browser. Evaluate institutional availability, licensing and standalone/LMS compatibility before treating it as an integration option.
- [Honorlock's extension documentation](https://honorlock.kb.help/honorlock-extension-permissions-and-functions/) describes tab/navigation controls. Its [July 22, 2025 release notes](https://honorlock.kb.help/honorlock-release-notes/) announced availability of its desktop application to all partners, adding application restrictions alongside BrowserGuard. Evaluate integration, device support, data handling and commercial terms separately; no service has been selected.

These sources were reviewed during the October 27, 2026 discussion. Recheck current documentation, compatibility and terms before selecting any provider.

## Ordinary-browser limits

The [Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API) can report that a page becomes hidden, such as when a student switches tabs. This detects a visibility change, not its purpose or proof of misconduct. The [Fullscreen standard](https://fullscreen.spec.whatwg.org/) preserves a user's ability to leave fullscreen; fullscreen is not an exam lock.

Do not build a homegrown tab trap or automatically penalize students for visibility/focus events. Any future event collection needs an explicit purpose, student notice, accommodations and human interpretation. No such monitoring is introduced here.
