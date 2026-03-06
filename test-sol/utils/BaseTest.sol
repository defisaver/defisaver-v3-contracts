// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IERC20 } from "../../contracts/interfaces/token/IERC20.sol";
import { SafeERC20 } from "../../contracts/_vendor/openzeppelin/SafeERC20.sol";
import { Config } from "../config/Config.sol";
import { Addresses } from "./helpers/MainnetAddresses.sol";

/// @notice Base test - root contract for all tests
contract BaseTest is Config {
    // EOA USERS
    address internal constant bob = address(0xbb);
    address internal constant alice = address(0xaa);
    address internal constant charlie = address(0xcc);
    address internal constant jane = address(0x11);

    error UnsupportedChain(string chain);

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

    function forkFromEnv(string memory testName) internal {
        _initConfigIfNeeded();
        string memory chain = _chainFromProfile();
        string memory rpc = _getRpcForChain(chain);
        bool isForkLatest = bytes(testName).length == 0;

        uint256 blockNumber;
        if (!isForkLatest) {
            blockNumber = getBlockNumberForChainAndTest(chain, testName);
        }

        _fork(rpc, blockNumber);
    }

    function _chainFromProfile() internal view returns (string memory) {
        string memory profile = vm.envOr("FOUNDRY_PROFILE", string("default"));
        if (keccak256(bytes(profile)) == keccak256("default")) {
            return "mainnet";
        }
        return profile;
    }

    function forkLocalAnvil() internal {
        string memory anvilRpc = "http://localhost:8545";
        _fork(anvilRpc, 0);
    }

    function forkTenderly() internal {
        string memory tenderlyForkId = vm.envString("FORK_ID");
        string memory base = "https://virtual.mainnet.rpc.tenderly.co/";
        string memory forkUrl = string(abi.encodePacked(base, tenderlyForkId));
        _fork(forkUrl, 0);
    }

    function _fork(string memory rpc, uint256 blockNumber) internal {
        uint256 fork = blockNumber == 0 ? vm.createFork(rpc) : vm.createFork(rpc, blockNumber);
        vm.selectFork(fork);
    }

    function _getRpcForChain(string memory chain) internal view returns (string memory) {
        if (keccak256(bytes(chain)) == keccak256("mainnet")) {
            return vm.envString("ETHEREUM_NODE");
        } else if (keccak256(bytes(chain)) == keccak256("arbitrum")) {
            return vm.envString("ARBITRUM_NODE");
        } else if (keccak256(bytes(chain)) == keccak256("optimism")) {
            return vm.envString("OPTIMISM_NODE");
        } else if (keccak256(bytes(chain)) == keccak256("base")) {
            return vm.envString("BASE_NODE");
        } else if (keccak256(bytes(chain)) == keccak256("linea")) {
            return vm.envString("LINEA_NODE");
        } else if (keccak256(bytes(chain)) == keccak256("plasma")) {
            return vm.envString("PLASMA_NODE");
        }
        revert UnsupportedChain(chain);
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

    function giveTokenAndApproveAsSender(
        address _sender,
        address _token,
        address _to,
        uint256 _amount
    ) internal executeAsSender(_sender) {
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
            if (
                block.chainid == 8453
                    && (pairs[i].supplyAsset == Addresses.USDT_ADDR
                        || pairs[i].supplyAsset == Addresses.DAI_ADDR)
            ) {
                pairs[i].supplyAsset = Addresses.USDC_ADDR;
            }
            if (
                block.chainid == 8453
                    && (pairs[i].borrowAsset == Addresses.USDT_ADDR
                        || pairs[i].borrowAsset == Addresses.DAI_ADDR)
            ) {
                pairs[i].borrowAsset = Addresses.USDC_ADDR;
            }

            testPairs.push(pairs[i]);
        }
    }
}

