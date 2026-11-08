import { createContext } from 'react';

/**
 * Element of the top bar where the screen's h1 is drawn. The shell provides it; outside the shell
 * (tests, public pages) it is null and the title stays where the screen renders it.
 */
export const PageTitleSlotContext = createContext<HTMLElement | null>(null);
