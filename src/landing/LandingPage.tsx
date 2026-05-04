import '../design/tokens.css'
import './LandingPage.css'

const features = [
  {
    id: 'feature-today-inbox',
    title: '오늘 업무함',
    description:
      '오늘 처리할 공문·피드백·보고서를 한 화면으로 정렬해 우선순위순으로 안내합니다.',
  },
  {
    id: 'feature-checklist',
    title: '공문 처리 체크리스트',
    description:
      '단계별 처리 상태와 체크 이력으로 누락이나 재작업을 줄이고 이관/승인 과정을 빠르게 처리합니다.',
  },
  {
    id: 'feature-submission-board',
    title: '제출물 수합판',
    description: '학급별 제출 상태를 시트처럼 모아 보고 미제출 항목을 즉시 확인할 수 있습니다.',
  },
  {
    id: 'feature-template-box',
    title: '반복 문서 템플릿함',
    description:
      '자주 쓰는 통지문, 안내문, 보고서 양식을 한 번에 저장해 반복 작업 시간을 단축합니다.',
  },
  {
    id: 'feature-calendar',
    title: '마감 캘린더',
    description:
      '학기 일정과 학교 행정 마감일을 한눈에 보여주어 놓치기 쉬운 업무를 미리 경고합니다.',
  },
]

export function LandingPage() {
  return (
    <main className="landing-root" data-od-id="landing-root">
      <div className="landing-frame">
        <header className="landing-top-bar" data-od-id="landing-header">
          <p className="landing-wordmark" data-od-id="wordmark">
            담임 행정 허브
          </p>
          <nav className="landing-nav" aria-label="메인 네비게이션" data-od-id="header-nav">
            <a href="#features" data-od-id="nav-features">
              기능
            </a>
            <a href="#demo" data-od-id="nav-demo">
              데모
            </a>
            <a href="#start" data-od-id="nav-start">
              시작
            </a>
          </nav>
        </header>

        <section className="landing-hero" aria-labelledby="hero-title" data-od-id="hero-section">
          <div className="landing-hero-copy" data-od-id="hero-copy">
            <h1 id="hero-title" className="landing-headline" data-od-id="hero-title">
              오늘 처리할 담임 행정 업무가 한 화면에 정리됩니다
            </h1>
            <p className="landing-subhead" data-od-id="hero-subhead">
              공문, 제출물, 템플릿, 마감일을 한 번에 확인해 교실 행정 업무를
              다음 단계까지 바로 이어가도록 돕습니다.
            </p>
            <div className="landing-cta-row" data-od-id="hero-cta-row">
              <a href="/login" className="landing-btn landing-btn-primary" data-od-id="cta-primary">
                업무함 열기
              </a>
              <a href="#demo" className="landing-btn landing-btn-secondary" data-od-id="cta-secondary">
                데모 보기
              </a>
            </div>
          </div>

          <article
            className="landing-hero-preview"
            aria-label="대시보드 미리보기"
            data-od-id="hero-preview"
          >
            <p className="landing-pill" data-od-id="preview-pill">
              오늘 업무 대시보드
            </p>
            <div className="landing-preview-summary">
              <p className="landing-preview-title" data-od-id="preview-title">
                담임님용 업무함
              </p>
              <section className="landing-task-board" data-od-id="preview-tasks">
                <header className="landing-board-title">
                  <strong>오늘 해야 할 일</strong>
                  <span>3건</span>
                </header>
                <div className="landing-board-row">
                  <div className="landing-row-item">
                    <span>학부모 공지 회신</span>
                    <span className="landing-status-danger">긴급</span>
                  </div>
                  <div className="landing-row-item">
                    <span>과제 제출물 수합</span>
                    <span className="landing-status-warn">마감 D-1</span>
                  </div>
                  <div className="landing-row-item">
                    <span>회의록 템플릿 배포</span>
                    <span className="landing-status-success">완료 예정</span>
                  </div>
                </div>
              </section>
              <section className="landing-task-board" data-od-id="preview-docs">
                <header className="landing-board-title">
                  <strong>진행 모드</strong>
                  <span>요약 뷰</span>
                </header>
                <div className="landing-board-row">
                  <div className="landing-row-item">
                    <span>오늘 제출물 수합판</span>
                    <span>5개</span>
                  </div>
                  <div className="landing-row-item">
                    <span>반복 문서 템플릿함</span>
                    <span>7개</span>
                  </div>
                </div>
              </section>
            </div>
          </article>
        </section>

        <div id="demo" className="landing-anchor" aria-hidden="true" />
        <section id="features" className="landing-section" aria-labelledby="features-title" data-od-id="features-section">
          <h2 id="features-title" className="landing-section-heading" data-od-id="features-title">
            담임 업무를 빠르게 정리하는 기능
          </h2>
          <div className="landing-features">
            {features.map((feature) => (
              <article className="landing-feature" key={feature.id} data-od-id={feature.id}>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="start" className="landing-footer-cta" data-od-id="footer-cta">
          <p data-od-id="footer-cta-copy">
            오늘 놓칠 일을 줄이고, 내일 처리할 일을 미리 봅니다.
          </p>
        </section>

        <footer className="landing-footer" data-od-id="site-footer">
          <div className="landing-footer-links" data-od-id="footer-links">
            <a href="#features" data-od-id="footer-link-features">
              기능
            </a>
            <a href="#demo" data-od-id="footer-link-demo">
              데모
            </a>
            <a href="/login" data-od-id="footer-link-start">
              시작하기
            </a>
          </div>
          <p data-od-id="footer-copyright">© 담임 행정 허브</p>
        </footer>
      </div>
    </main>
  )
}

export default LandingPage
