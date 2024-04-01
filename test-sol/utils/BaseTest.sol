// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import { Test } from "forge-std/Test.sol";

import { IERC20 } from "../../contracts/interfaces/IERC20.sol";
import { SafeERC20 } from "../../contracts/utils/SafeERC20.sol";
import { Config } from "../config/Config.sol";

/// @notice Base test - root contract for all tests
contract BaseTest is Config {
    
    // EOA USERS
    address internal constant bob = address(0xbb);
    address internal constant alice = address(0xaa);

    using SafeERC20 for IERC20;

    bool private configInitialized;

    TestPair[] testPairs;

    modifier executeAsSender(address _sender) {
        vm.prank(_sender);
        _;
        vm.stopPrank();
    }

    function setUp() public virtual {
        vm.label(address(bob), "Bob");
        vm.label(address(alice), "Alice");
        _initConfigIfNeeded();
    }

    function forkMainnet(string memory testName) internal {
        _initConfigIfNeeded();

        uint256 blockNumber = getBlockNumberForTestIfExist(testName);
        string memory mainnerRpc = vm.envString("ETHEREUM_NODE");
        uint256 mainnetFork = vm.createFork(mainnerRpc, blockNumber);
        vm.selectFork(mainnetFork);
    }

    function forkMainnetLatest() internal {
        string memory mainnerRpc = vm.envString("ETHEREUM_NODE");
        uint256 mainnetFork = vm.createFork(mainnerRpc);
        vm.selectFork(mainnetFork);
    }

    function approve(address _token, address _to, uint256 _amount) internal {
        IERC20(_token).safeApprove(_to, _amount);
    }

    function approveAsSender(address _sender, address _token, address _to, uint256 _amount) internal executeAsSender(_sender) {
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

    function removeSelector(bytes memory _data) internal pure returns (bytes memory) {
        bytes memory result = new bytes(_data.length - 4);
        for (uint i = 4; i < _data.length; i++) {
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
