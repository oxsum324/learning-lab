import { questions as structural } from './graded-content/structural-analysis.js?v=0.16.0';
import { questions as concrete } from './graded-content/reinforced-concrete.js?v=0.16.0';
import { questions as steel } from './graded-content/steel-structures.js?v=0.16.0';
import { questions as dynamics } from './graded-content/structural-dynamics.js?v=0.16.0';
import { questions as soil } from './graded-content/soil-foundations.js?v=0.16.0';

export const QUESTION_BANK = [...structural,...concrete,...steel,...dynamics,...soil];
export function getQuestions(topic,day,level) {
  return QUESTION_BANK.filter(q=>q.topic===topic && q.day===Number(day) && (level===undefined || q.level===Number(level)));
}
