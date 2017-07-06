// db collections
const tables = {
  LINES: 'lines',
  MEDIA: 'media',
  CHANGESETS: 'changesets',
  REVISIONS: 'revisions',
  USERS: 'users',
  LOGS: 'logs',
  SNAPSHOTS: 'snapshots',
};

const states = {
  PENDING: 'pending',
  APPLIED: 'applied',
  DONE: 'done',
  CANCELED: 'canceled',
  LOGGED: 'logged',
};

const revisionTypes = {
  LINE_ADD: 'lineAdd',
  LINE_EDIT: 'lineEdit',
  INFO_EDIT: 'infoEdit',
};

export { tables, states, revisionTypes };
