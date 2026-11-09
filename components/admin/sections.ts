export type Content = Record<string, Record<string, string>>;

export type FieldDefinition = {
  key: string;
  label: string;
  rows?: number;
  hint?: string;
};

export type SectionDefinition = {
  id: string;
  title: string;
  shortTitle?: string;
  description: string;
  fields: FieldDefinition[];
};

const field = (key: string, label: string, rows?: number, hint?: string): FieldDefinition => ({
  key,
  label,
  rows,
  hint,
});

export const sections: SectionDefinition[] = [
  {
    id: 'hero',
    title: 'Hero section',
    description: 'The first thing visitors see when they land on your website.',
    fields: [
      field('eyebrow', 'Eyebrow text', undefined, 'The small label above your headline.'),
      field('heading', 'Headline', 2, 'Make it clear, confident, and memorable.'),
      field('body', 'Supporting text', 3),
      field('button', 'Button text'),
      field('note', 'Button note'),
    ],
  },
  {
    id: 'prediction',
    title: 'From prediction to reasoning',
    shortTitle: 'Prediction to reasoning',
    description: 'Introduce the shift from prediction to geological reasoning.',
    fields: [field('eyebrow', 'Eyebrow text'), field('body', 'Opening line', 2), field('supporting', 'Supporting line', 2)],
  },
  {
    id: 'firstPrinciples',
    title: 'First principles',
    description: 'Explain the thinking behind the IREX approach.',
    fields: [field('eyebrow', 'Eyebrow text'), field('heading', 'Headline', 2), field('body', 'Supporting text', 3), field('paragraphOne', 'First paragraph', 3), field('paragraphTwo', 'Second paragraph', 3), field('paragraphThree', 'Closing statement', 2)],
  },
  {
    id: 'problem',
    title: 'The problem',
    description: 'Describe the challenges facing exploration decisions.',
    fields: [field('label', 'Section label'), field('statements', 'Opening statement', 2), field('preIntro', 'Introduction', 2), field('heading', 'Headline', 2), field('body', 'Supporting text', 4), field('listIntro', 'List introduction'), field('bulletOne', 'First point', 2), field('bulletTwo', 'Second point', 2), field('bulletThree', 'Third point', 2), field('bulletFour', 'Fourth point', 2)],
  },
  {
    id: 'limitations',
    title: 'Limitations',
    description: 'Show why conventional approaches fall short.',
    fields: [field('eyebrow', 'Eyebrow text'), field('heading', 'Headline', 2), field('paragraphOne', 'First paragraph', 2), field('paragraphTwo', 'Second paragraph', 2), field('listIntro', 'List introduction'), field('bulletOne', 'First point', 2), field('bulletTwo', 'Second point', 2), field('bulletThree', 'Third point', 2), field('closing', 'Closing statement', 3)],
  },
  {
    id: 'reasoning',
    title: 'Reasoning process',
    description: 'Walk visitors through how IREX reasons at scale.',
    fields: [field('eyebrow', 'Eyebrow text'), field('heading', 'Headline'), field('body', 'Supporting text', 2), field('intro', 'Introduction'), field('stepOneTitle', 'First step title'), field('stepOneBody', 'First step description', 3), field('stepTwoTitle', 'Second step title'), field('stepTwoBody', 'Second step description', 3), field('stepThreeTitle', 'Third step title'), field('stepThreeBody', 'Third step description', 3)],
  },
  {
    id: 'principle',
    title: 'Core principle',
    description: 'Share the principle that guides the IREX system.',
    fields: [field('eyebrow', 'Eyebrow text'), field('headingFirst', 'Headline, first line'), field('headingSecond', 'Headline, second line'), field('contrastFirst', 'First contrast label'), field('contrastFirstEmphasis', 'First contrast emphasis'), field('contrastSecond', 'Second contrast label'), field('contrastSecondEmphasis', 'Second contrast emphasis'), field('body', 'Supporting text', 4), field('closing', 'Closing statement', 2)],
  },
  {
    id: 'transparency',
    title: 'Transparency',
    description: 'Explain how IREX makes every decision auditable.',
    fields: [field('eyebrow', 'Eyebrow text'), field('heading', 'Headline'), field('itemOneTitle', 'First card title'), field('itemOneBody', 'First card description', 2), field('itemTwoTitle', 'Second card title'), field('itemTwoBody', 'Second card description', 2), field('itemThreeTitle', 'Third card title'), field('itemThreeBody', 'Third card description', 2), field('itemFourTitle', 'Fourth card title'), field('itemFourBody', 'Fourth card description', 2), field('closingFirst', 'First closing line', 2), field('closingSecond', 'Second closing line', 2)],
  },
  {
    id: 'control',
    title: 'Control',
    description: 'Describe the control and ownership IREX provides.',
    fields: [field('eyebrow', 'Eyebrow text'), field('heading', 'Headline'), field('body', 'Supporting text', 3), field('itemOneTitle', 'First card title'), field('itemOneBody', 'First card description', 2), field('itemTwoTitle', 'Second card title'), field('itemTwoBody', 'Second card description', 2), field('itemThreeTitle', 'Third card title'), field('itemThreeBody', 'Third card description', 2), field('itemFourTitle', 'Fourth card title'), field('itemFourBody', 'Fourth card description', 2), field('itemFiveTitle', 'Fifth card title'), field('itemFiveBody', 'Fifth card description', 2), field('itemSixTitle', 'Sixth card title'), field('itemSixBody', 'Sixth card description', 2), field('closing', 'Closing statement', 3)],
  },
  {
    id: 'value',
    title: 'Economic value',
    description: 'Make the value of better exploration decisions clear.',
    fields: [field('eyebrow', 'Eyebrow text'), field('heading', 'Headline', 2), field('body', 'Supporting text', 2), field('itemOne', 'First point', 2), field('itemTwo', 'Second point', 2), field('itemThree', 'Third point', 2), field('itemFour', 'Fourth point', 2), field('outcomeLead', 'Outcome, first line'), field('outcomeBody', 'Outcome, second line'), field('closing', 'Closing statement', 2)],
  },
  {
    id: 'positioning',
    title: 'Positioning',
    description: 'Set IREX apart from conventional prediction models.',
    fields: [field('eyebrow', 'Eyebrow text'), field('heading', 'Headline', 2), field('body', 'Supporting text', 3)],
  },
  {
    id: 'cgr',
    title: 'About CGR',
    description: 'Define Computational Geological Reasoning for visitors.',
    fields: [field('eyebrow', 'Eyebrow text'), field('intro', 'Introduction', 2), field('standout', 'Featured statement', 2), field('body', 'Description', 4), field('closing', 'Closing statement', 3)],
  },
  {
    id: 'apply',
    title: 'Early adopter program',
    shortTitle: 'Early adopter program',
    description: 'Invite the right people to join the program.',
    fields: [field('heading', 'Headline'), field('body', 'Supporting text', 3), field('button', 'Button text'), field('note', 'Button note')],
  },
  {
    id: 'site',
    title: 'Header and footer',
    description: 'Edit the text that appears throughout your site.',
    fields: [field('headerStatement', 'Header statement'), field('footerTagline', 'Footer tagline', 2)],
  },
  {
    id: 'application',
    title: 'Application form',
    description: 'Personalize the copy in the application form.',
    fields: [field('eyebrow', 'Eyebrow text'), field('heading', 'Headline', 2), field('body', 'Introduction', 3), field('nameLabel', 'Name field label'), field('companyLabel', 'Company field label'), field('emailLabel', 'Email field label'), field('messageLabel', 'Message field label'), field('submitButton', 'Submit button text'), field('sendingButton', 'Sending button text'), field('successHeading', 'Success headline'), field('successBody', 'Success message'), field('error', 'Error message', 2)],
  },
];