import {isEditorial} from './article-author.js';
export const summarySections=['Prima squadra','Next Gen e Primavera','Juventus Women','Politica sportiva','Altri temi'];
// Articles may also be filed under Nazionale. The executive Summary keeps five areas (Nazionale counts in
// Altri temi); site and PDF give the national team its own section only from four articles.
export const NATIONAL_TEAM='Nazionale';
export const NATIONAL_SECTION_MIN=4;
export const articleSections=['Prima squadra','Next Gen e Primavera','Juventus Women','Politica sportiva',NATIONAL_TEAM,'Altri temi'];
export const nationalSectionShown=articles=>articles.filter(a=>a.category===NATIONAL_TEAM).length>=NATIONAL_SECTION_MIN;
export function withNationalSection(articles){const own=nationalSectionShown(articles);return own?articles:articles.map(a=>a.category===NATIONAL_TEAM?{...a,category:'Altri temi'}:a);}
export const shortSectionLabels={'Prima squadra':'Squadra','Next Gen e Primavera':'Next Gen','Juventus Women':'Women','Politica sportiva':'Politica','Nazionale':'Nazionale','Altri temi':'Altri temi'};
export const shortSectionLabel=category=>shortSectionLabels[category]||category;
export const legacySummarySections=['Prima squadra maschile','Prima squadra femminile','Politica sportiva','Varie'];
const mapping={'Prima squadra maschile':'Prima squadra','Prima squadra femminile':'Juventus Women','Varie':'Altri temi','Temi vari':'Altri temi','Mercato':'Prima squadra','Società e dirigenza':'Prima squadra','Arbitri e VAR':'Politica sportiva','Prossimo avversario':'Prima squadra','Next Gen':'Next Gen e Primavera','Primavera':'Next Gen e Primavera','Settore giovanile':'Next Gen e Primavera','Youth League':'Next Gen e Primavera'};
export function summaryCategory(article){const category=['Editoriali','Editoriale','Commenti'].includes(article.category)?article.topic:article.category;return summarySections.includes(category)?category:mapping[category]||'Altri temi';}
export function normalizeExecutiveSummary(summary){if(!summary)return summary;return {...summary,sections:summarySections.map(title=>({title,items:summary.sections.filter(s=>summaryCategory({category:s.title})===title).flatMap(s=>s.items)}))};}
const rawCategory=article=>['Editoriali','Editoriale','Commenti'].includes(article.category)?article.topic:article.category;
export function summaryEdition(body){return {...body,executiveSummary:normalizeExecutiveSummary(body.executiveSummary),articles:withNationalSection(body.articles.map(a=>({...a,isEditorial:isEditorial(a),category:rawCategory(a)===NATIONAL_TEAM?NATIONAL_TEAM:summaryCategory(a)})))};}
