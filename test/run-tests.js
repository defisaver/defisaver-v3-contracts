/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
/* eslint-disable guard-for-in */
const { exec } = require('child_process');
const events = require('events');
const fs = require('fs');
const { exit } = require('process');

function getTestFiles(dir, files_) {
    // eslint-disable-next-line no-param-reassign
    files_ = files_ || [];
    const files = fs.readdirSync(dir);
    for (const i in files) {
        const name = `${dir}/${files[i]}`;
        if (fs.statSync(name).isDirectory()) {
            getTestFiles(name, files_);
        } else if (name.toString().includes('full-test.js')) {
            files_.push(name);
        }
    }
    return files_;
}

const DEFAULT_NODE_COUNT = 11;
const MAX_NODE_COUNT = 22;
const NODE_GRACE_TIME = 15000;
const MAX_RETRIES = 3;

class TestRunner extends events.EventEmitter {
    constructor() {
        super();
        this.pendingTests = [];
        this.total = 0;
        this.passed = 0;
        this.passedTests = [];
        this.retries = 0;
        this.liveNodes = 0;
        this.startEpoch = 0;
        this.on(
            'NodeReady',
            this.nodeReadyListener,
        ).on(
            'NodeClosed',
            this.nodeClosedListener,
        ).on(
            'TestClosed',
            this.testClosedListener,
        );
    }

    nodeReadyListener(nodeHandle, id) {
        if (this.pendingTests.length === 0) {
            nodeHandle.kill('SIGTERM');
            return;
        }
        if (nodeHandle.exitCode === null && nodeHandle.killed === false) {
            const { retries, fileName } = this.pendingTests.pop();
            this.startTest(nodeHandle, id, { retries, fileName });
        }
    }

    nodeClosedListener(id, signal) {
        this.liveNodes--;
        if (signal === null) {
            this.startNode(id);
        } else if (this.liveNodes === 0) {
            this.finish();
        }
    }

    testClosedListener(nodeHandle, testHandle, test, id) {
        if (testHandle.exitCode === 0) {
            this.passed++;
            // eslint-disable-next-line no-param-reassign
            test.endTime = Date.now();
            // eslint-disable-next-line no-param-reassign
            test.time = Math.ceil((test.endTime - test.startTime) / 1000);
            this.passedTests.push(test);
            this.emit('NodeReady', nodeHandle, id);
            this.log(`${test.fileName} passed`);
            // github actions wont kill nodes properly. This is a backup finish check.
            if (this.passed === this.total) this.finish();
        } else if (nodeHandle.exitCode !== null) {
            this.pendingTests.push(test);
        } else if (test.retries > 0) {
            this.retries++;
            // eslint-disable-next-line no-param-reassign
            test.retries--;
            this.pendingTests.push(test);
            this.emit('NodeReady', nodeHandle, id);
            this.log(`${test.fileName} retrying #${MAX_RETRIES - test.retries}`);
        } else {
            this.log(`${test.fileName} failed ${MAX_RETRIES} times, exiting(1)`);
            exit(1);
        }
    }

    run(nodeCount, testFileNames) {
        this.pendingTests = testFileNames.map((e) => Object({
            retries: MAX_RETRIES,
            fileName: e,
        }));
        this.total = this.pendingTests.length;
        this.startEpoch = Date.now();

        const min = (a, b) => (a > b ? b : a);
        if (nodeCount > min(this.total, MAX_NODE_COUNT)) {
            // eslint-disable-next-line no-param-reassign
            nodeCount = min(this.total, MAX_NODE_COUNT);
        }
        for (let i = 0; i < nodeCount; i++) {
            this.startNode(i);
        }

        console.log(`${this.total} tests queued for ${nodeCount} nodes`);
    }

    startNode(id) {
        this.liveNodes++;
        const nodeHandle = exec(
            `npx hardhat node --port ${8545 + id}`,
        ).on(
            'close',
            (code, signal) => this.emit('NodeClosed', id, signal),
        );
        setTimeout(() => this.emit('NodeReady', nodeHandle, id), NODE_GRACE_TIME);

        return nodeHandle;
    }

    startTest(nodeHandle, id, test) {
        // eslint-disable-next-line no-param-reassign
        test.startTime = Date.now();
        const runner = this;
        const testHandle = exec(
            `npx hardhat test --network local${id} ${test.fileName}`,
            (error, stdout) => {
                // eslint-disable-next-line no-param-reassign
                test.output = stdout;
                if (error) {
                    console.log(error);
                    console.log(stdout);
                }
            },
        ).on(
            'close',
            function () {
                runner.emit('TestClosed', nodeHandle, this, test, id);
            },
        );
        return testHandle;
    }

    log(msg = '') {
        const tPlus = `[${Math.ceil((Date.now() - this.startEpoch) / 1000)}s]\t`;
        const status = `total: ${this.total} passed: ${this.passed} nodes: ${this.liveNodes} retries: ${this.retries} `;
        console.log(`${tPlus} ${msg} (${status})`);
    }

    finish() {
        // const comp = (a, b) => (a.fileName > b.fileName ? 1 : -1);
        // this.passedTests.sort(comp).forEach((e) => console.log(e.output));
        this.passedTests.sort((a, b) => b.time - a.time).forEach((e) => console.log(`${e.fileName.padEnd(32)}\tretries: ${MAX_RETRIES - e.retries}\ttime: ${e.time}`));
        console.log(`${this.passed}/${this.total} tests passed`);
        if (this.total !== this.passed) exit(1);
        exit(0);
    }
}

(async function () {
    const testFileNames = getTestFiles('test');
    const runner = new TestRunner();

    let nodeCount = DEFAULT_NODE_COUNT;
    if (process.argv.length > 2) nodeCount = process.argv[2];
    runner.run(nodeCount, testFileNames);
}());
