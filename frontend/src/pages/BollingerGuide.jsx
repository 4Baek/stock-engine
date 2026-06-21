import React from 'react';

const sections = [
  {
    title: '분석 대상과 후보군',
    items: [
      {
        name: '분석 대상 (universe_mode)',
        key: 'top_value | all',
        description: '추천 후보군을 어떻게 구성할지 정합니다.',
        impact: 'top_value는 유동성/거래대금 상위 종목만 분석해 속도와 실전성을 높입니다. all은 (KR 전용) 전체 종목을 평가해 탐색 범위를 넓히지만 시간이 오래 걸립니다.',
        glossary: [
          '유니버스: 점수를 계산할 전체 후보 종목 묶음입니다.',
          '노이즈: 실제 매매 판단에 도움이 적은 신호/변동입니다.',
        ],
      },
      {
        name: '유동성/거래대금 상위 개수 (top_value_count, us_candidate_count)',
        key: '50 ~ 500',
        description: '후보군 크기입니다. 숫자가 클수록 더 많은 종목을 비교합니다.',
        impact: '값이 커지면 숨은 종목을 찾기 쉬워지지만 분석 시간이 늘고 노이즈도 증가합니다. 값이 작으면 빠르고 안정적이지만 기회가 줄어듭니다.',
        glossary: [
          '유동성: 원하는 가격대에서 사고팔기 쉬운 정도입니다.',
          '거래대금: 거래량 x 가격으로 계산되는 거래 규모입니다.',
        ],
      },
      {
        name: '추천 개수 (limit)',
        key: '1 ~ 20',
        description: '최종 카드로 보여줄 종목 수입니다.',
        impact: '점수 계산에는 영향을 주지 않고 출력 개수만 바꿉니다.',
        glossary: [
          '출력 개수: 계산 완료 후 사용자에게 보여주는 상위 N개입니다.',
        ],
      },
      {
        name: '최소 점수 (min_score)',
        key: '0 ~ 100',
        description: '이 점수 이상인 종목만 추천 대상으로 표시합니다.',
        impact: '값을 높이면 신호가 강한 종목만 남아 품질은 올라가지만 결과 수가 줄어들 수 있습니다. 너무 높으면 자동 완화/참고용 추천이 동작할 수 있습니다.',
        glossary: [
          '임계값: 통과/탈락을 나누는 기준선입니다.',
          '자동 완화: 결과가 너무 적을 때 기준을 조금 낮추는 안전장치입니다.',
        ],
      },
    ],
  },
  {
    title: '점수 가중치 항목',
    items: [
      {
        name: '상단 돌파 가중치 (breakout_weight)',
        key: '0 ~ 60 (기본 35)',
        description: '상단 밴드 돌파/근접 강도 점수 비중입니다.',
        impact: '올리면 모멘텀 돌파형 종목이 상위에 더 많이 올라옵니다. 과도하게 높이면 추격형 성향이 강해질 수 있습니다.',
        glossary: [
          '모멘텀 돌파형: 최근 상승 힘이 강해 저항 구간을 뚫는 패턴입니다.',
          '추격형 성향: 이미 오른 종목을 더 따라붙는 선택 경향입니다.',
        ],
      },
      {
        name: '스퀴즈 가중치 (squeeze_weight)',
        key: '0 ~ 60 (기본 20)',
        description: '밴드 수축(변동성 압축) 신호 비중입니다.',
        impact: '올리면 변동성 확장 직전 패턴을 선호합니다. 너무 높이면 아직 추세가 확인되지 않은 종목이 섞일 수 있습니다.',
        glossary: [
          '스퀴즈: 변동성이 줄어 밴드 폭이 좁아진 상태입니다.',
          '변동성 확장: 좁았던 가격 범위가 다시 크게 움직이는 구간입니다.',
        ],
      },
      {
        name: '추세 가중치 (trend_weight)',
        key: '0 ~ 60 (기본 15)',
        description: '60일선 대비 상대 강도를 반영하는 비중입니다.',
        impact: '올리면 우상향 흐름 종목이 유리하고, 낮추면 역추세/초기 전환 후보 비중이 커질 수 있습니다.',
        glossary: [
          '우상향 흐름: 고점과 저점이 점진적으로 높아지는 상태입니다.',
          '역추세: 기존 추세와 반대 방향의 반등/반락 구간입니다.',
        ],
      },
      {
        name: '거래량 가중치 (volume_weight)',
        key: '0 ~ 60 (기본 15)',
        description: '평균 대비 거래량 증가 강도 비중입니다.',
        impact: '올리면 수급이 붙는 종목이 상위로 오릅니다. 이벤트성 거래량 급증 종목 비중이 높아질 수 있습니다.',
        glossary: [
          '수급: 매수/매도 자금이 유입·유출되는 흐름입니다.',
          '이벤트성 급증: 뉴스/실적 발표 등 일시 이슈로 거래량이 치솟는 현상입니다.',
        ],
      },
      {
        name: '중심선 상단 가중치 (above_middle_weight)',
        key: '0 ~ 60 (기본 10)',
        description: '가격 위치(밴드 중단 이상 유지) 비중입니다.',
        impact: '올리면 안정적 우위 구간 종목이 유리해집니다. 낮추면 돌파/거래량 신호 중심으로 결과가 변합니다.',
        glossary: [
          '중심선: 보통 20일 이동평균선으로, 밴드의 기준선입니다.',
          '우위 구간: 매수 쪽 힘이 상대적으로 강한 가격 위치입니다.',
        ],
      },
      {
        name: '하단 이탈 패널티 (breakout_down_penalty)',
        key: '0 ~ 60 (기본 20)',
        description: '하단 이탈 리스크를 감점하는 비중입니다.',
        impact: '올리면 하락 리스크 종목이 강하게 탈락합니다. 너무 높으면 반등 초기 종목도 과하게 제외될 수 있습니다.',
        glossary: [
          '하단 이탈: 가격이 하단 밴드 아래로 밀리는 약세 신호입니다.',
          '감점: 다른 항목에서 얻은 점수를 줄여 순위를 내리는 처리입니다.',
        ],
      },
    ],
  },
  {
    title: '보조 임계값과 트레이드 플랜',
    items: [
      {
        name: '거래량 기준(배) (volume_threshold)',
        key: '1.0 ~ 5.0 (기본 1.3)',
        description: '거래량 강도 평가의 기준 배수입니다.',
        impact: '값을 올리면 거래량 항목 통과가 어려워져 보수적이 됩니다. 값을 내리면 더 많은 종목이 거래량 점수를 얻습니다.',
        glossary: [
          '배수: 평균 대비 몇 배인지 나타내는 비율입니다.',
          '보수적: 신호 기준을 엄격하게 해 후보를 줄이는 성향입니다.',
        ],
      },
      {
        name: 'ATR 배수 (atr_multiplier)',
        key: '0.5 ~ 3.0 (기본 1.6)',
        description: '추천 손절가 계산에서 변동성(ATR)을 얼마나 반영할지 정합니다.',
        impact: '값을 올리면 손절가가 더 넓어져 흔들림에 덜 잘리는 대신 손실 허용 폭이 커집니다. 값을 내리면 손절가가 타이트해집니다.',
        glossary: [
          'ATR: 평균 진폭(변동성) 지표로, 최근 가격 흔들림 크기를 나타냅니다.',
          '타이트 손절: 손절 간격을 좁혀 빠르게 리스크를 차단하는 방식입니다.',
        ],
      },
      {
        name: '최소/최대 손익비 (target_rr_min, target_rr_max)',
        key: '최소 1.0~5.0 / 최대 1.0~6.0',
        description: '추천 익절가 계산에서 목표 손익비 범위를 정합니다.',
        impact: '최소·최대 값을 높이면 더 긴 수익 구간을 노리게 됩니다. 반대로 낮추면 보수적인 익절가가 제시됩니다.',
        glossary: [
          '손익비(R:R): 기대수익/허용손실 비율입니다.',
          '적응형 추천: 종목의 변동성과 점수 강도에 맞춰 자동 계산하는 방식입니다.',
        ],
      },
    ],
  },
];

const presets = [
  {
    name: '보수형',
    description: '추세와 리스크 관리 중심. 신호 수는 줄지만 품질 안정화에 유리합니다.',
    values: 'min_score 40, trend 20, downside_penalty 28, volume_threshold 1.5',
  },
  {
    name: '균형형',
    description: '기본 추천과 유사한 밸런스. 과최적화 없이 운영하기 좋습니다.',
    values: 'min_score 30, breakout 35, squeeze 20, trend 15, volume 15',
  },
  {
    name: '공격형',
    description: '돌파/거래량 비중을 높여 단기 탄력 종목을 빠르게 포착합니다.',
    values: 'min_score 25, breakout 45, volume 20, trend 10, downside_penalty 12',
  },
];

export default function BollingerGuide() {
  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-lg shadow-slate-200/40">
        <p className="text-sm uppercase tracking-[0.35em] text-slate-500">Bollinger Guide</p>
        <h1 className="mt-3 text-3xl font-bold text-slate-900">볼리저밴드 추천 기준 상세 설명</h1>
        <p className="mt-3 text-slate-600">
          각 설정값이 추천 점수와 결과 종목에 어떤 영향을 주는지 정리한 페이지입니다.
          값 조정 전 기준을 확인하면 추천 결과를 의도한 방향으로 더 빠르게 맞출 수 있습니다.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {presets.map((preset) => (
          <article key={preset.name} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-sky-700">{preset.name}</p>
            <p className="mt-2 text-sm text-slate-600">{preset.description}</p>
            <p className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-700">{preset.values}</p>
          </article>
        ))}
      </section>

      {sections.map((section) => (
        <section key={section.title} className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-lg shadow-slate-200/40">
          <h2 className="text-2xl font-bold text-slate-900">{section.title}</h2>
          <div className="mt-5 grid gap-4">
            {section.items.map((item) => (
              <article key={item.name} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-lg font-semibold text-slate-900">{item.name}</h3>
                  <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">{item.key}</span>
                </div>
                <p className="mt-3 text-sm text-slate-700">{item.description}</p>
                <p className="mt-2 text-sm text-slate-600">값 변화 영향: {item.impact}</p>
                {item.glossary?.length ? (
                  <div className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700">
                    <p className="font-semibold text-slate-900">용어 풀이</p>
                    <ul className="mt-2 space-y-1">
                      {item.glossary.map((line) => {
                        const [term, ...rest] = line.split(':');
                        return (
                          <li key={`${item.name}-${line}`}>* {term}: {rest.join(':').trim()}</li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
