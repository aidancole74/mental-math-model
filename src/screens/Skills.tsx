import { nextToLearn } from '../engine/curriculum';
import { mastery } from '../engine/scheduler';
import { categoryStats, skillBadge } from '../engine/stats';
import { go } from '../router';
import { SKILLS, getSkill } from '../skills/registry';
import { useData } from '../storage/store';
import { Icon } from '../ui/bits';
import { CATEGORY_LABELS, CATEGORY_ORDER } from '../ui/labels';
import { CatTile, PageHead, Ring } from '../ui/visuals';

export function Skills() {
  const data = useData();
  const next = nextToLearn(data);
  const learned = SKILLS.filter((s) => s.id in data.skills).length;

  return (
    <main className="screen">
      <div className="screen-body" style={{ gap: 22 }}>
        <PageHead
          title="Learn"
          sub={learned + ' of ' + SKILLS.length + ' skills learned'}
          right={
            <Ring value={learned / SKILLS.length} size={52} stroke={6} label={learned + ' of ' + SKILLS.length + ' learned'}>
              <span style={{ fontSize: '0.8rem' }}>{Math.round((learned / SKILLS.length) * 100)}%</span>
            </Ring>
          }
        />

        {CATEGORY_ORDER.map((cat) => {
          const skills = SKILLS.filter((s) => s.category === cat);
          if (skills.length === 0) return null;
          const st = categoryStats(data, cat);
          return (
            <section key={cat} className={'cat-section cat-' + cat} aria-label={CATEGORY_LABELS[cat]}>
              <div className="cat-head">
                <CatTile category={cat} size={40} />
                <div className="row-main">
                  <div className="cat-head-title">{CATEGORY_LABELS[cat]}</div>
                  <div className="cat-head-sub">
                    {st.learned} of {st.total} learned{st.mastered ? ' · ' + st.mastered + ' mastered' : ''}
                  </div>
                </div>
              </div>

              {skills.map((skill) => {
                const badge = skillBadge(data, skill.id);
                const p = data.skills[skill.id];
                const isNext = next?.id === skill.id;
                const sub =
                  badge === 'mastered'
                    ? 'Mastered'
                    : badge === 'learning'
                      ? skill.blurb
                      : badge === 'ready'
                        ? skill.blurb
                        : 'Learn ' + skill.prereqs.map((id) => getSkill(id).title).join(' and ') + ' first';
                return (
                  <button
                    key={skill.id}
                    className={'row skill-row' + (badge === 'locked' ? ' is-locked' : '') + (isNext ? ' is-next' : '')}
                    onClick={() => go('/skill/' + skill.id)}
                  >
                    <Ring value={p ? mastery(p) : 0} size={40} stroke={4} color="var(--cat)">
                      {badge === 'locked' && <Icon name="lock" size={16} />}
                      {badge === 'mastered' && (
                        <span style={{ color: 'var(--cat)', display: 'grid' }}>
                          <Icon name="check" size={18} />
                        </span>
                      )}
                      {badge === 'ready' && (
                        <span style={{ color: 'var(--cat)', display: 'grid' }}>
                          <Icon name="play" size={14} />
                        </span>
                      )}
                    </Ring>
                    <div className="row-main">
                      <div className="row-title">
                        {skill.title}
                        {isNext && <span className="tag">Next</span>}
                      </div>
                      <div className="row-sub">{sub}</div>
                    </div>
                    <span className="muted" style={{ display: 'grid' }}>
                      <Icon name="chevron" size={18} />
                    </span>
                  </button>
                );
              })}
            </section>
          );
        })}
      </div>
    </main>
  );
}
