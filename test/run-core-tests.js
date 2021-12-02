// helper file to run all core test files

require('./auth/admin-auth');
require('./auth/admin-vault');
require('./auth/proxy-permission');

require('./core/bot-auth.js');
require('./core/bundle-storage.js');
require('./core/dfs-registry.js');
require('./core/proxy-auth.js');
require('./core/strategy-executor.js');
require('./core/strategy-storage.js');
require('./core/sub-proxy.js');
require('./core/sub-storage.js');
