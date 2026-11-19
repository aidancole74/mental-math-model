/**
 * Big answer buttons for problems with named answers (days of the week).
 * One tap answers — there is no separate Check step.
 */
export function ChoicePad({
  choices,
  onPick,
  disabled,
  picked,
}: {
  choices: string[];
  onPick: (index: number) => void;
  disabled: boolean;
  picked: number | null;
}) {
  return (
    <div className={'choices' + (choices.length % 2 ? ' is-odd' : '')}>
      {choices.map((label, i) => (
        <button
          key={label}
          className={'choice-key' + (picked === i ? ' is-picked' : '')}
          onClick={() => onPick(i)}
          disabled={disabled}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
