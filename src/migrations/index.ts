import * as migration_20261022_210630_initial from './20261022_210630_initial';
import * as migration_20261116_191646_multi_tenant from './20261116_191646_multi_tenant';

export const migrations = [
  {
    up: migration_20261022_210630_initial.up,
    down: migration_20261022_210630_initial.down,
    name: '20261022_210630_initial',
  },
  {
    up: migration_20261116_191646_multi_tenant.up,
    down: migration_20261116_191646_multi_tenant.down,
    name: '20261116_191646_multi_tenant'
  },
];
