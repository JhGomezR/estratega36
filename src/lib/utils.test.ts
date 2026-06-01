import { cn } from '@/lib/utils';

describe('cn (class merge)', () => {
  it('joins class names', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('resolves conflicting tailwind utilities (last wins)', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it('ignores falsey values', () => {
    expect(cn('a', false && 'b', null, undefined, 'c')).toBe('a c');
  });
});
