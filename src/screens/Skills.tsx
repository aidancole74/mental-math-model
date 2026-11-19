import { statusOf } from '../engine/curriculum';
import { isMastered, mastery } from '../engine/scheduler';
import { go } from '../router';
import { SKILLS, getSkill } from '../skills/registry';
import { useData } from '../storage/store';
import { Bar, Icon, TopBar } from '../ui/bits';
import { CATEGORY_LABELS, CATEGORY_ORDER } from '../ui/labels';

export function Skills() {
  const data = useData();

  return (
    <main className="screen">
      <TopBar onBack={() => go('/')} title="All skills" />
      <div className="screen-body">
        {CATEGORY_ORDER.map((cat) => {
          const skills = SKILLS.filter((s) => s.category === cat);
          if (skills.length === 0) return null;
          return (
            <section key={cat} className="list">
              <h2 className="eyebrow" style={{ margin: '8px 0 2px' }}>
                {CATEGORY_LABELS[cat]}
              </h2>
              {skills.map((skill) => {
                const status = statusOf(data, skill);
                const progress = data.skills[skill.id];
                const sub =
                  status === 'learned'
                    ? progress && isMastered(progress)
                      ? 'Mastered'
                      : 'Learning'
                    : status === 'available'
                      ? 'Ready to learn'
                      : 'Learn ' + skill.prereqs.map((p) => getSkill(p).title).join(', ') + ' first';
                return (
                  <button
                    key={skill.id}
                    className={'row' + (status === 'locked' ? ' is-locked' : '')}
                    onClick={() => go('/skill/' + skill.id)}
                  >
                    <div className="row-main">
                      <div className="row-title">{skill.title}</div>
                      <div className="row-sub">{sub}</div>
                      {progress && <Bar value={mastery(progress)} label={skill.title + ' mastery'} />}
                    </div>
                    {status === 'locked' && <Icon name="lock" size={20} />}
                    {progress && isMastered(progress) && <Icon name="check" size={22} />}
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
