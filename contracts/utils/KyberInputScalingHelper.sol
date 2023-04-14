// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import {IERC20} from "../interfaces/IERC20.sol";
import {IExecutorHelper} from "../interfaces/kyber/IExecutorHelper.sol";
import {IMetaAggregationRouterV2} from "../interfaces/kyber/IMetaAggregationRouterV2.sol";

contract KyberInputScalingHelper {
    uint256 private constant _PARTIAL_FILL = 0x01;
    uint256 private constant _REQUIRES_EXTRA_ETH = 0x02;
    uint256 private constant _SHOULD_CLAIM = 0x04;
    uint256 private constant _BURN_FROM_MSG_SENDER = 0x08;
    uint256 private constant _BURN_FROM_TX_ORIGIN = 0x10;
    uint256 private constant _SIMPLE_SWAP = 0x20;

    struct Swap {
        bytes data;
        bytes4 functionSelector;
    }

    struct SimpleSwapData {
        address[] firstPools;
        uint256[] firstSwapAmounts;
        bytes[] swapDatas;
        uint256 deadline;
        bytes destTokenFeeData;
    }

    struct SwapExecutorDescription {
        Swap[][] swapSequences;
        address tokenIn;
        address tokenOut;
        uint256 minTotalAmountOut;
        address to;
        uint256 deadline;
        bytes destTokenFeeData;
    }

    /// @dev if selector is 0, we need to decode the selector from the data and copy the rest of the data (L2 network)
    /// @dev if selector is filled, it means data is already split (L1 network)
    function getScaledInputData(
        bytes4 selector,
        bytes memory inputData,
        uint256 newAmount
    ) public pure returns (bytes memory) {
        if (selector == IMetaAggregationRouterV2.swap.selector) {
            IMetaAggregationRouterV2.SwapExecutionParams memory params = abi.decode(
                inputData,
                (IMetaAggregationRouterV2.SwapExecutionParams)
            );

            (params.desc, params.targetData) = _getScaledInputDataV2(
                params.desc,
                params.targetData,
                newAmount,
                _flagsChecked(params.desc.flags, _SIMPLE_SWAP)
            );
            return abi.encodeWithSelector(selector, params);
        } else if (selector == IMetaAggregationRouterV2.swapSimpleMode.selector) {
            (
                address callTarget,
                IMetaAggregationRouterV2.SwapDescriptionV2 memory desc,
                bytes memory targetData,
                bytes memory clientData
            ) = abi.decode(
                    inputData,
                    (address, IMetaAggregationRouterV2.SwapDescriptionV2, bytes, bytes)
                );

            (desc, targetData) = _getScaledInputDataV2(desc, targetData, newAmount, true);
            return abi.encodeWithSelector(selector, callTarget, desc, targetData, clientData);
        } else revert("InputScalingHelper: Invalid selector");
    }

    function _getScaledInputDataV2(
        IMetaAggregationRouterV2.SwapDescriptionV2 memory desc,
        bytes memory executorData,
        uint256 newAmount,
        bool isSimpleMode
    ) internal pure returns (IMetaAggregationRouterV2.SwapDescriptionV2 memory, bytes memory) {
        uint256 oldAmount = desc.amount;
        if (oldAmount == newAmount) {
            return (desc, executorData);
        }

        // simple mode swap
        if (isSimpleMode) {
            return (
                _scaledSwapDescriptionV2(desc, oldAmount, newAmount),
                _scaledSimpleSwapData(executorData, oldAmount, newAmount)
            );
        }

        //normal mode swap
        return (
            _scaledSwapDescriptionV2(desc, oldAmount, newAmount),
            _scaledExecutorCallBytesData(executorData, oldAmount, newAmount)
        );
    }

    /// @dev Scale the swap description
    function _scaledSwapDescriptionV2(
        IMetaAggregationRouterV2.SwapDescriptionV2 memory desc,
        uint256 oldAmount,
        uint256 newAmount
    ) internal pure returns (IMetaAggregationRouterV2.SwapDescriptionV2 memory) {
        desc.minReturnAmount = (desc.minReturnAmount * newAmount) / oldAmount;
        if (desc.minReturnAmount == 0) desc.minReturnAmount = 1;
        desc.amount = newAmount;
        for (uint256 i = 0; i < desc.srcReceivers.length; i++) {
            desc.srcAmounts[i] = (desc.srcAmounts[i] * newAmount) / oldAmount;
        }
        return desc;
    }

    /// @dev Scale the executorData in case swapSimpleMode
    function _scaledSimpleSwapData(
        bytes memory data,
        uint256 oldAmount,
        uint256 newAmount
    ) internal pure returns (bytes memory) {
        SimpleSwapData memory swapData = abi.decode(data, (SimpleSwapData));
        for (uint256 i = 0; i < swapData.firstPools.length; i++) {
            swapData.firstSwapAmounts[i] = (swapData.firstSwapAmounts[i] * newAmount) / oldAmount;
        }
        return abi.encode(swapData);
    }

    /// @dev Scale the executorData in case normal swap
    function _scaledExecutorCallBytesData(
        bytes memory data,
        uint256 oldAmount,
        uint256 newAmount
    ) internal pure returns (bytes memory) {
        SwapExecutorDescription memory executorDesc = abi.decode(data, (SwapExecutorDescription));
        executorDesc.minTotalAmountOut = (executorDesc.minTotalAmountOut * newAmount) / oldAmount;
        for (uint256 i = 0; i < executorDesc.swapSequences.length; i++) {
            Swap memory swap = executorDesc.swapSequences[i][0];
            bytes4 functionSelector = swap.functionSelector;

            if (functionSelector == IExecutorHelper.executeUniSwap.selector) {
                swap.data = newUniSwap(swap.data, oldAmount, newAmount);
            } else if (functionSelector == IExecutorHelper.executeStableSwap.selector) {
                swap.data = newStableSwap(swap.data, oldAmount, newAmount);
            } else if (functionSelector == IExecutorHelper.executeCurveSwap.selector) {
                swap.data = newCurveSwap(swap.data, oldAmount, newAmount);
            } else if (functionSelector == IExecutorHelper.executeKyberDMMSwap.selector) {
                swap.data = newKyberDMM(swap.data, oldAmount, newAmount);
            } else if (functionSelector == IExecutorHelper.executeUniV3ProMMSwap.selector) {
                swap.data = newUniV3ProMM(swap.data, oldAmount, newAmount);
            } else if (functionSelector == IExecutorHelper.executeRfqSwap.selector) {
                revert("InputScalingHelper: Can not scale RFQ swap");
            } else if (functionSelector == IExecutorHelper.executeBalV2Swap.selector) {
                swap.data = newBalancerV2(swap.data, oldAmount, newAmount);
            } else if (functionSelector == IExecutorHelper.executeDODOSwap.selector) {
                swap.data = newDODO(swap.data, oldAmount, newAmount);
            } else if (functionSelector == IExecutorHelper.executeVelodromeSwap.selector) {
                swap.data = newVelodrome(swap.data, oldAmount, newAmount);
            } else if (functionSelector == IExecutorHelper.executeGMXSwap.selector) {
                swap.data = newGMX(swap.data, oldAmount, newAmount);
            } else if (functionSelector == IExecutorHelper.executeSynthetixSwap.selector) {
                swap.data = newSynthetix(swap.data, oldAmount, newAmount);
            } else if (functionSelector == IExecutorHelper.executeHashflowSwap.selector) {
                revert("InputScalingHelper: Can not scale RFQ swap");
            } else if (functionSelector == IExecutorHelper.executeCamelotSwap.selector) {
                swap.data = newCamelot(swap.data, oldAmount, newAmount);
            } else if (functionSelector == IExecutorHelper.executeKyberLimitOrder.selector) {
                revert("InputScalingHelper: Can not scale RFQ swap");
            } else if (functionSelector == IExecutorHelper.executeWrappedstETHSwap.selector) {
                swap.data = newWrappedstETHSwap(swap.data, oldAmount, newAmount);
            } else if (functionSelector == IExecutorHelper.executePSMSwap.selector) {
                swap.data = newPSM(swap.data, oldAmount, newAmount);
            } else if (functionSelector == IExecutorHelper.executeFraxSwap.selector) {
                swap.data = newFrax(swap.data, oldAmount, newAmount);
            } else if (functionSelector == IExecutorHelper.executePlatypusSwap.selector) {
                swap.data = newPlatypus(swap.data, oldAmount, newAmount);
            } else revert("AggregationExecutor: Dex type not supported");
        }
        return abi.encode(executorDesc);
    }

    function newUniSwap(
        bytes memory data,
        uint256 oldAmount,
        uint256 newAmount
    ) internal pure returns (bytes memory) {
        IExecutorHelper.UniSwap memory uniSwap = abi.decode(data, (IExecutorHelper.UniSwap));
        uniSwap.collectAmount = (uniSwap.collectAmount * newAmount) / oldAmount;
        return abi.encode(uniSwap);
    }

    function newStableSwap(
        bytes memory data,
        uint256 oldAmount,
        uint256 newAmount
    ) internal pure returns (bytes memory) {
        IExecutorHelper.StableSwap memory stableSwap = abi.decode(
            data,
            (IExecutorHelper.StableSwap)
        );
        stableSwap.dx = (stableSwap.dx * newAmount) / oldAmount;
        return abi.encode(stableSwap);
    }

    function newCurveSwap(
        bytes memory data,
        uint256 oldAmount,
        uint256 newAmount
    ) internal pure returns (bytes memory) {
        IExecutorHelper.CurveSwap memory curveSwap = abi.decode(data, (IExecutorHelper.CurveSwap));
        curveSwap.dx = (curveSwap.dx * newAmount) / oldAmount;
        return abi.encode(curveSwap);
    }

    function newKyberDMM(
        bytes memory data,
        uint256 oldAmount,
        uint256 newAmount
    ) internal pure returns (bytes memory) {
        IExecutorHelper.UniSwap memory kyberDMMSwap = abi.decode(data, (IExecutorHelper.UniSwap));
        kyberDMMSwap.collectAmount = (kyberDMMSwap.collectAmount * newAmount) / oldAmount;
        return abi.encode(kyberDMMSwap);
    }

    function newUniV3ProMM(
        bytes memory data,
        uint256 oldAmount,
        uint256 newAmount
    ) internal pure returns (bytes memory) {
        IExecutorHelper.UniSwapV3ProMM memory uniSwapV3ProMM = abi.decode(
            data,
            (IExecutorHelper.UniSwapV3ProMM)
        );
        uniSwapV3ProMM.swapAmount = (uniSwapV3ProMM.swapAmount * newAmount) / oldAmount;

        return abi.encode(uniSwapV3ProMM);
    }

    function newBalancerV2(
        bytes memory data,
        uint256 oldAmount,
        uint256 newAmount
    ) internal pure returns (bytes memory) {
        IExecutorHelper.BalancerV2 memory balancerV2 = abi.decode(
            data,
            (IExecutorHelper.BalancerV2)
        );
        balancerV2.amount = (balancerV2.amount * newAmount) / oldAmount;
        return abi.encode(balancerV2);
    }

    function newDODO(
        bytes memory data,
        uint256 oldAmount,
        uint256 newAmount
    ) internal pure returns (bytes memory) {
        IExecutorHelper.DODO memory dodo = abi.decode(data, (IExecutorHelper.DODO));
        dodo.amount = (dodo.amount * newAmount) / oldAmount;
        return abi.encode(dodo);
    }

    function newVelodrome(
        bytes memory data,
        uint256 oldAmount,
        uint256 newAmount
    ) internal pure returns (bytes memory) {
        IExecutorHelper.UniSwap memory velodrome = abi.decode(data, (IExecutorHelper.UniSwap));
        velodrome.collectAmount = (velodrome.collectAmount * newAmount) / oldAmount;
        return abi.encode(velodrome);
    }

    function newGMX(
        bytes memory data,
        uint256 oldAmount,
        uint256 newAmount
    ) internal pure returns (bytes memory) {
        IExecutorHelper.GMX memory gmx = abi.decode(data, (IExecutorHelper.GMX));
        gmx.amount = (gmx.amount * newAmount) / oldAmount;
        return abi.encode(gmx);
    }

    function newSynthetix(
        bytes memory data,
        uint256 oldAmount,
        uint256 newAmount
    ) internal pure returns (bytes memory) {
        IExecutorHelper.Synthetix memory synthetix = abi.decode(data, (IExecutorHelper.Synthetix));
        synthetix.sourceAmount = (synthetix.sourceAmount * newAmount) / oldAmount;
        return abi.encode(synthetix);
    }

    function newCamelot(
        bytes memory data,
        uint256 oldAmount,
        uint256 newAmount
    ) internal pure returns (bytes memory) {
        IExecutorHelper.UniSwap memory camelot = abi.decode(data, (IExecutorHelper.UniSwap));
        camelot.collectAmount = (camelot.collectAmount * newAmount) / oldAmount;
        return abi.encode(camelot);
    }

    function newPlatypus(
        bytes memory data,
        uint256 oldAmount,
        uint256 newAmount
    ) internal pure returns (bytes memory) {
        IExecutorHelper.Platypus memory platypus = abi.decode(data, (IExecutorHelper.Platypus));
        platypus.collectAmount = (platypus.collectAmount * newAmount) / oldAmount;
        return abi.encode(platypus);
    }

    function newWrappedstETHSwap(
        bytes memory data,
        uint256 oldAmount,
        uint256 newAmount
    ) internal pure returns (bytes memory) {
        IExecutorHelper.WSTETH memory wstEthData = abi.decode(data, (IExecutorHelper.WSTETH));
        wstEthData.amount = (wstEthData.amount * newAmount) / oldAmount;
        return abi.encode(wstEthData);
    }

    function newPSM(
        bytes memory data,
        uint256 oldAmount,
        uint256 newAmount
    ) internal pure returns (bytes memory) {
        IExecutorHelper.PSM memory psm = abi.decode(data, (IExecutorHelper.PSM));
        psm.amountIn = (psm.amountIn * newAmount) / oldAmount;
        return abi.encode(psm);
    }

    function newFrax(
        bytes memory data,
        uint256 oldAmount,
        uint256 newAmount
    ) internal pure returns (bytes memory) {
        IExecutorHelper.UniSwap memory frax = abi.decode(data, (IExecutorHelper.UniSwap));
        frax.collectAmount = (frax.collectAmount * newAmount) / oldAmount;
        return abi.encode(frax);
    }

    function _flagsChecked(uint256 number, uint256 flag) internal pure returns (bool) {
        return number & flag != 0;
    }
}
