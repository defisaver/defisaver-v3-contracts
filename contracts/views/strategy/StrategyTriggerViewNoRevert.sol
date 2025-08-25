// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import {IPoolV3} from "../../interfaces/aaveV3/IPoolV3.sol";
import {IPoolAddressesProvider} from "../../interfaces/aaveV3/IPoolAddressesProvider.sol";
import {IERC20} from "../../interfaces/IERC20.sol";
import {ISafe} from "../../interfaces/safe/ISafe.sol";
import {ITrigger} from "../../interfaces/ITrigger.sol";
import {IComet} from "../../interfaces/compoundV3/IComet.sol";
import {IFeedRegistry} from "../../interfaces/chainlink/IFeedRegistry.sol";
import {BundleStorage} from "../../core/strategy/BundleStorage.sol";
import {CheckWalletType} from "../../utils/CheckWalletType.sol";
import {DSProxy} from "../../DS/DSProxy.sol";
import {CoreHelper} from "../../core/helpers/CoreHelper.sol";
import {DFSRegistry} from "../../core/DFSRegistry.sol";
import {StrategyModel} from "../../core/strategy/StrategyModel.sol";
import {StrategyStorage} from "../../core/strategy/StrategyStorage.sol";
import {TokenUtils} from "../../utils/TokenUtils.sol";
import {StrategyIDs} from "./StrategyIDs.sol";
import {AaveV3Helper} from "../../actions/aaveV3/helpers/AaveV3Helper.sol";
import {UtilHelper} from "../../utils/helpers/UtilHelper.sol";
import {Denominations} from "../../utils/Denominations.sol";
import {StableCoinUtils} from "./StableCoinUtils.sol";

/// @title StrategyTriggerViewNoRevert - Helper contract to check whether a trigger is triggered or not for a given sub.
/// @dev This contract is designed to avoid reverts from checking triggers.
contract StrategyTriggerViewNoRevert is StrategyModel, CoreHelper, CheckWalletType, AaveV3Helper, UtilHelper {
    DFSRegistry public constant registry = DFSRegistry(REGISTRY_ADDR);
    IFeedRegistry public constant feedRegistry = IFeedRegistry(CHAINLINK_FEED_REGISTRY);

    address internal constant DEFAULT_SPARK_MARKET_MAINNET = 0x02C3eA4e34C0cBd694D2adFa2c690EECbC1793eE;

    uint256 public constant MIN_DEBT_IN_USD_MAINNET = 5000 * 1e8;
    uint256 public constant MIN_DEBT_IN_USD_L2 = 50 * 1e8;

    using StrategyIDs for uint256;
    using TokenUtils for address;
    using StableCoinUtils for address;

    enum TriggerStatus {
        FALSE,
        TRUE,
        REVERT
    }

    /*//////////////////////////////////////////////////////////////
                             PUBLIC FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    /// @notice Check if a single trigger is triggered or not.
    /// @dev This function uses high level `isTriggered` call with try-catch to avoid revert.
    /// @param triggerId - The ID of the trigger to check.
    /// @param triggerCalldata - The calldata to pass to the trigger.
    /// @param triggerSubData - The sub data to pass to the trigger.
    /// @return TriggerStatus - The status of the trigger (FALSE, TRUE, REVERT).
    function checkSingleTrigger(bytes4 triggerId, bytes memory triggerCalldata, bytes memory triggerSubData)
        public
        returns (TriggerStatus)
    {
        address triggerAddr = registry.getAddr(triggerId);

        if (triggerAddr == address(0)) return TriggerStatus.REVERT;

        try ITrigger(triggerAddr).isTriggered(triggerCalldata, triggerSubData) returns (bool isTriggered) {
            if (!isTriggered) {
                return TriggerStatus.FALSE;
            } else {
                return TriggerStatus.TRUE;
            }
        } catch {
            return TriggerStatus.REVERT;
        }
    }

    /// @notice Check if a single trigger is triggered or not.
    /// @dev This function uses low level `call` with try-catch to avoid revert.
    /// @param triggerId - The ID of the trigger to check.
    /// @param txData - The calldata to pass to the trigger.
    /// @return TriggerStatus - The status of the trigger (FALSE, TRUE, REVERT).
    function checkSingleTriggerLowLevel(bytes4 triggerId, bytes memory txData) public returns (TriggerStatus) {
        address triggerAddr = registry.getAddr(triggerId);

        if (triggerAddr == address(0)) return TriggerStatus.REVERT;

        (bool success, bytes memory data) = triggerAddr.call(txData);

        if (success) {
            bool isTriggered = abi.decode(data, (bool));
            if (isTriggered) {
                return TriggerStatus.TRUE;
            } else {
                return TriggerStatus.FALSE;
            }
        } else {
            return TriggerStatus.REVERT;
        }
    }

    /// @notice Check if a strategy is triggered or not for a given sub
    /// @dev This function uses high level `isTriggered` call with try-catch to avoid revert.
    /// @param _sub - The subscription to check.
    /// @param _triggerCallData - The calldata to pass to the triggers.
    /// @param smartWallet - The smart wallet of the subscription.
    /// @return TriggerStatus - The status of the trigger (FALSE, TRUE, REVERT).
    function checkTriggers(StrategySub memory _sub, bytes[] calldata _triggerCallData, address smartWallet)
        public
        returns (TriggerStatus)
    {
        Strategy memory strategy;

        uint256 strategyId = _sub.strategyOrBundleId;

        if (_sub.isBundle) {
            strategyId = BundleStorage(BUNDLE_STORAGE_ADDR).getStrategyId(_sub.strategyOrBundleId, 0);
        }

        strategy = StrategyStorage(STRATEGY_STORAGE_ADDR).getStrategy(strategyId);

        bytes4[] memory triggerIds = strategy.triggerIds;

        address triggerAddr;

        for (uint256 i = 0; i < triggerIds.length; i++) {
            triggerAddr = registry.getAddr(triggerIds[i]);
            try ITrigger(triggerAddr).isTriggered(_triggerCallData[i], _sub.triggerData[i]) returns (bool isTriggered) {
                if (!isTriggered) {
                    return TriggerStatus.FALSE;
                }
            } catch {
                return TriggerStatus.REVERT;
            }
        }

        // check DCA & LO for all chains
        if (strategyId.isDCAStrategy() || strategyId.isLimitOrderStrategy()) {
            return _tryToVerifyRequiredAmountAndAllowance(smartWallet, _sub.subData);
        }

        // check AaveV3 leverage management, repay on price strategies and close strategies for all chains. We don't check for boost on price (BoP), as we want to always allow it. If debt is 0, BoP will open a leveraged position on price.
        if (
            strategyId.isAaveV3LeverageManagementStrategy() || strategyId.isAaveV3RepayOnPriceStrategy()
                || strategyId.isAaveV3CloseStrategy()
        ) {
            return _verifyAaveV3MinDebtPosition(smartWallet);
        }

        // check Spark leverage management for only mainnet deployment
        if (block.chainid == 1 && strategyId.isSparkLeverageManagementStrategy()) {
            return _verifySparkMinDebtPosition(smartWallet);
        }

        // check Comp V3 leverage management, repay on price strategies and close strategies for all chains. We don't check for boost on price (BoP), as we want to always allow it. If debt is 0, BoP will open a leveraged position on price.
        if (
            strategyId.isCompoundV3LeverageManagementStrategy() || strategyId.isCompoundV3RepayOnPriceStrategy()
                || strategyId.isCompoundV3CloseStrategy()
        ) {
            return _tryToVerifyCompV3MinDebtPosition(smartWallet, _sub.subData);
        }

        return TriggerStatus.TRUE;
    }

    /*//////////////////////////////////////////////////////////////
                              VERIFY LOGIC
    //////////////////////////////////////////////////////////////*/
    function _tryToVerifyRequiredAmountAndAllowance(address _smartWallet, bytes32[] memory _subData)
        internal
        view
        returns (TriggerStatus)
    {
        try this.verifyRequiredAmountAndAllowance(_smartWallet, _subData) returns (TriggerStatus status) {
            return status;
        } catch {
            return TriggerStatus.REVERT;
        }
    }

    function verifyRequiredAmountAndAllowance(address _smartWallet, bytes32[] memory _subData)
        external
        view
        returns (TriggerStatus)
    {
        address sellTokenAddr = address(uint160(uint256(_subData[0])));
        uint256 desiredAmount = uint256(_subData[2]);

        address tokenHolder = _fetchTokenHolder(_smartWallet);
        bool hasEnoughBalance = sellTokenAddr.getBalance(tokenHolder) >= desiredAmount;

        if (tokenHolder != _smartWallet) {
            uint256 currentAllowance = IERC20(sellTokenAddr).allowance(tokenHolder, _smartWallet);
            bool hasEnoughAllowance = currentAllowance >= desiredAmount;
            return (hasEnoughBalance && hasEnoughAllowance) ? TriggerStatus.TRUE : TriggerStatus.FALSE;
        }

        return hasEnoughBalance ? TriggerStatus.TRUE : TriggerStatus.FALSE;
    }

    function _tryToVerifyCompV3MinDebtPosition(address _smartWallet, bytes32[] memory _subData)
        internal
        view
        returns (TriggerStatus)
    {
        try this._verifyCompV3MinDebtPosition(_smartWallet, _subData) returns (TriggerStatus status) {
            return status;
        } catch {
            return TriggerStatus.REVERT;
        }
    }

    function _verifyCompV3MinDebtPosition(address _smartWallet, bytes32[] memory _subData)
        public
        view
        returns (TriggerStatus status)
    {
        IComet comet = IComet(address(uint160(uint256(_subData[0]))));

        address baseToken = comet.baseToken();
        uint256 chainlinkPriceInUSD;

        /// @dev We don't fetch price for stable coin, we assume it is always:  1 stable == 1 USD
        /// @dev We are okay with slight depegs, as this code is only used for total debt in USD estimation.
        if (baseToken.isStableCoin()) {
            uint256 amountBorrowed = comet.borrowBalanceOf(_smartWallet) * 1e8 / 10 ** comet.decimals();
            return _hasEnoughMinDebtInUSD(amountBorrowed) ? TriggerStatus.TRUE : TriggerStatus.FALSE;
        }

        if (baseToken == WETH_ADDR) baseToken = ETH_ADDR;

        try feedRegistry.latestRoundData(baseToken, Denominations.USD) returns (
            uint80, int256 answer, uint256, uint256, uint80
        ) {
            chainlinkPriceInUSD = uint256(answer);
        } catch {
            /// @dev If we can't fetch price, we won't revert, we will just return true
            return TriggerStatus.TRUE;
        }

        uint256 totalDebtInUSD = chainlinkPriceInUSD * comet.borrowBalanceOf(_smartWallet) / 10 ** comet.decimals();
        return _hasEnoughMinDebtInUSD(totalDebtInUSD) ? TriggerStatus.TRUE : TriggerStatus.FALSE;
    }

    function _verifyAaveV3MinDebtPosition(address _smartWallet) internal view returns (TriggerStatus) {
        /// @dev AaveV3 automation only supports Core market at the moment (Default market)
        IPoolV3 lendingPool = IPoolV3(IPoolAddressesProvider(DEFAULT_AAVE_MARKET).getPool());
        (, uint256 totalDebtUSD,,,,) = lendingPool.getUserAccountData(_smartWallet);
        return _hasEnoughMinDebtInUSD(totalDebtUSD) ? TriggerStatus.TRUE : TriggerStatus.FALSE;
    }

    function _verifySparkMinDebtPosition(address _smartWallet) internal view returns (TriggerStatus) {
        /// @dev Spark automation is only deployed on Mainnet, so we can hardcode the market address
        IPoolV3 lendingPool = IPoolV3(IPoolAddressesProvider(DEFAULT_SPARK_MARKET_MAINNET).getPool());
        (, uint256 totalDebtUSD,,,,) = lendingPool.getUserAccountData(_smartWallet);
        return _hasEnoughMinDebtInUSD(totalDebtUSD) ? TriggerStatus.TRUE : TriggerStatus.FALSE;
    }

    /*//////////////////////////////////////////////////////////////
                                HELPERS
    //////////////////////////////////////////////////////////////*/
    function _fetchTokenHolder(address _subWallet) internal view returns (address) {
        if (isDSProxy(_subWallet)) {
            return DSProxy(payable(_subWallet)).owner();
        }
        // if not DSProxy, we assume we are in context of Safe
        address[] memory owners = ISafe(_subWallet).getOwners();
        return owners.length == 1 ? owners[0] : _subWallet;
    }

    function _hasEnoughMinDebtInUSD(uint256 _userDebtInUSD) internal view returns (bool) {
        if (block.chainid == 1) {
            return _userDebtInUSD >= MIN_DEBT_IN_USD_MAINNET;
        }

        return _userDebtInUSD >= MIN_DEBT_IN_USD_L2;
    }
}
