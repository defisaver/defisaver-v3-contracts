// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IERC20 } from "../../contracts/interfaces/IERC20.sol";
import { SafeERC20 } from "../../contracts/utils/SafeERC20.sol";
import { Config } from "../config/Config.sol";

/// @notice Base test - root contract for all tests
contract BaseTest is Config {
    // EOA USERS
    address internal constant bob = address(0xbb);
    address internal constant alice = address(0xaa);
    address internal constant charlie = address(0xcc);

    using SafeERC20 for IERC20;

    bool private configInitialized;

    TestPair[] testPairs;

    modifier executeAsSender(address _sender) {
        vm.startPrank(_sender);
        _;
        vm.stopPrank();
    }

    modifier revertToSnapshot() {
        uint256 snapshotId = vm.snapshotState();
        _;
        vm.revertToState(snapshotId);
    }

    function setUp() public virtual {
        vm.label(address(bob), "Bob");
        vm.label(address(alice), "Alice");
        _initConfigIfNeeded();
    }

    function forkMainnet(string memory testName) internal {
        _initConfigIfNeeded();

        uint256 blockNumber = getBlockNumberForTestIfExist(testName);
        string memory mainnetRpc = vm.envString("ETHEREUM_NODE");
        uint256 mainnetFork = vm.createFork(mainnetRpc, blockNumber);
        vm.selectFork(mainnetFork);
    }

    function forkMainnetLatest() internal {
        string memory mainnetRpc = vm.envString("ETHEREUM_NODE");
        uint256 mainnetFork = vm.createFork(mainnetRpc);
        vm.selectFork(mainnetFork);
    }

    function forkLocalAnvil() internal {
        string memory anvilRpc = "http://localhost:8545";
        uint256 anvilFork = vm.createFork(anvilRpc);
        vm.selectFork(anvilFork);
    }

    function forkTenderly() internal {
        string memory tenderlyForkId = vm.envString("FORK_ID");
        string memory base = "https://virtual.mainnet.rpc.tenderly.co/";
        string memory forkUrl = string(abi.encodePacked(base, tenderlyForkId));
        uint256 tenderlyFork = vm.createFork(forkUrl);
        vm.selectFork(tenderlyFork);
    }

    function approve(address _token, address _to, uint256 _amount) internal {
        IERC20(_token).safeApprove(_to, _amount);
    }

    function approveAsSender(address _sender, address _token, address _to, uint256 _amount)
        internal
        executeAsSender(_sender)
    {
        IERC20(_token).safeApprove(_to, _amount);
    }

    function giveTokenAndApproveAsSender(address _sender, address _token, address _to, uint256 _amount)
        internal
        executeAsSender(_sender)
    {
        give(_token, _sender, _amount);
        IERC20(_token).safeApprove(_to, _amount);
    }

    function balanceOf(address _token, address _who) internal view returns (uint256) {
        return IERC20(_token).balanceOf(_who);
    }

    function prank(address _sender) internal {
        vm.prank(_sender);
    }

    function stopPrank() internal {
        vm.stopPrank();
    }

    function startPrank(address _sender) internal {
        vm.startPrank(_sender);
    }

    function consumePrank() internal view {
        (bool success,) = address(0).staticcall("");
        success; // silence unused variable warning
    }

    function removeSelector(bytes memory _data) internal pure returns (bytes memory) {
        bytes memory result = new bytes(_data.length - 4);
        for (uint256 i = 4; i < _data.length; i++) {
            result[i - 4] = _data[i];
        }
        return result;
    }

    function _initConfigIfNeeded() public {
        if (!configInitialized) {
            initConfig();
            configInitialized = true;
        }
    }

    function initTestPairs(string memory _protocolName) internal {
        _initConfigIfNeeded();

        TestPair[] memory pairs = getTestPairsForProtocol(_protocolName);
        for (uint256 i = 0; i < pairs.length; ++i) {
            testPairs.push(pairs[i]);
        }
    }
}
