// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import {IExecutorHelper} from "../../interfaces/kyber/IExecutorHelper.sol";
import {IMetaAggregationRouterV2} from "../../interfaces/kyber/IMetaAggregationRouterV2.sol";

contract KyberInputScalingHelper {
    uint256 private constant _PARTIAL_FILL = 0x01;
    uint256 private constant _REQUIRES_EXTRA_ETH = 0x02;
    uint256 private constant _SHOULD_CLAIM = 0x04;
    uint256 private constant _BURN_FROM_MSG_SENDER = 0x08;
    uint256 private constant _BURN_FROM_TX_ORIGIN = 0x10;
    uint256 private constant _SIMPLE_SWAP = 0x20;

    // fee data in case taking in dest token
    struct PositiveSlippageFeeData {
        uint256 partnerPSInfor; // [partnerReceiver (160 bit) + partnerPercent(96bits)]
        uint256 expectedReturnAmount;
    }

    struct Swap {
        bytes data;
        bytes32 selectorAndFlags; // [selector (32 bits) + flags (224 bits)]; selector is 4 most significant bytes; flags are stored in 4 least significant bytes.
    }

    struct SimpleSwapData {
        address[] firstPools;
        uint256[] firstSwapAmounts;
        bytes[] swapDatas;
        uint256 deadline;
        bytes positiveSlippageData;
    }

    struct SwapExecutorDescription {
        Swap[][] swapSequences;
        address tokenIn;
        address tokenOut;
        address to;
        uint256 deadline;
        bytes positiveSlippageData;
    }

    function getScaledInputData(
        bytes calldata inputData,
        uint256 newAmount
    ) public pure returns (bytes memory) {
        bytes4 selector = bytes4(inputData[:4]);
        bytes calldata dataToDecode = inputData[4:];

        if (selector == IMetaAggregationRouterV2.swap.selector) {
            IMetaAggregationRouterV2.SwapExecutionParams memory params = abi.decode(
                dataToDecode,
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
                    dataToDecode,
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

        uint256 nReceivers = desc.srcReceivers.length;
        for (uint256 i = 0; i < nReceivers; ) {
            desc.srcAmounts[i] = (desc.srcAmounts[i] * newAmount) / oldAmount;
            unchecked {
                ++i;
            }
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

        uint256 nPools = swapData.firstPools.length;
        for (uint256 i = 0; i < nPools; ) {
            swapData.firstSwapAmounts[i] = (swapData.firstSwapAmounts[i] * newAmount) / oldAmount;
            unchecked {
                ++i;
            }
        }
        swapData.positiveSlippageData = _scaledPositiveSlippageFeeData(
            swapData.positiveSlippageData,
            oldAmount,
            newAmount
        );
        return abi.encode(swapData);
    }

    function _scaledExecutorCallBytesData(
        bytes memory data,
        uint256 oldAmount,
        uint256 newAmount
    ) internal pure returns (bytes memory) {
        SwapExecutorDescription memory executorDesc = abi.decode(data, (SwapExecutorDescription));

        executorDesc.positiveSlippageData = _scaledPositiveSlippageFeeData(
            executorDesc.positiveSlippageData,
            oldAmount,
            newAmount
        );

        uint256 nSequences = executorDesc.swapSequences.length;
        for (uint256 i = 0; i < nSequences; ) {
            Swap memory swap = executorDesc.swapSequences[i][0];
            bytes4 functionSelector = bytes4(swap.selectorAndFlags);

            if (functionSelector == IExecutorHelper.executeUniswap.selector) {
                swap.data = newUniSwap(swap.data, oldAmount, newAmount);
            } else if (functionSelector == IExecutorHelper.executeStableSwap.selector) {
                swap.data = newStableSwap(swap.data, oldAmount, newAmount);
            } else if (functionSelector == IExecutorHelper.executeCurve.selector) {
                swap.data = newCurveSwap(swap.data, oldAmount, newAmount);
            } else if (functionSelector == IExecutorHelper.executeKSClassic.selector) {
                swap.data = newKyberDMM(swap.data, oldAmount, newAmount);
            } else if (functionSelector == IExecutorHelper.executeUniV3KSElastic.selector) {
                swap.data = newUniV3ProMM(swap.data, oldAmount, newAmount);
            } else if (functionSelector == IExecutorHelper.executeRfq.selector) {
                revert("InputScalingHelper: Can not scale RFQ swap");
            } else if (functionSelector == IExecutorHelper.executeBalV2.selector) {
                swap.data = newBalancerV2(swap.data, oldAmount, newAmount);
            } else if (functionSelector == IExecutorHelper.executeWrappedstETH.selector) {
                swap.data = newWrappedstETHSwap(swap.data, oldAmount, newAmount);
            } else if (functionSelector == IExecutorHelper.executeStEth.selector) {
                swap.data = newStETHSwap(swap.data, oldAmount, newAmount);
            } else if (functionSelector == IExecutorHelper.executeDODO.selector) {
                swap.data = newDODO(swap.data, oldAmount, newAmount);
            } else if (functionSelector == IExecutorHelper.executeVelodrome.selector) {
                swap.data = newVelodrome(swap.data, oldAmount, newAmount);
            } else if (functionSelector == IExecutorHelper.executeGMX.selector) {
                swap.data = newGMX(swap.data, oldAmount, newAmount);
            } else if (functionSelector == IExecutorHelper.executeSynthetix.selector) {
                swap.data = newSynthetix(swap.data, oldAmount, newAmount);
            } else if (functionSelector == IExecutorHelper.executeHashflow.selector) {
                revert("InputScalingHelper: Can not scale Hasflow swap");
            } else if (functionSelector == IExecutorHelper.executeCamelot.selector) {
                swap.data = newCamelot(swap.data, oldAmount, newAmount);
            } else if (functionSelector == IExecutorHelper.executeKyberLimitOrder.selector) {
                revert("InputScalingHelper: Can not scale KyberLO swap");
            } else if (functionSelector == IExecutorHelper.executePSM.selector) {
                swap.data = newPSM(swap.data, oldAmount, newAmount);
            } else if (functionSelector == IExecutorHelper.executeFrax.selector) {
                swap.data = newFrax(swap.data, oldAmount, newAmount);
            } else if (functionSelector == IExecutorHelper.executePlatypus.selector) {
                swap.data = newPlatypus(swap.data, oldAmount, newAmount);
            } else if (functionSelector == IExecutorHelper.executeMaverick.selector) {
                swap.data = newMaverick(swap.data, oldAmount, newAmount);
            } else if (functionSelector == IExecutorHelper.executeSyncSwap.selector) {
                swap.data = newSyncSwap(swap.data, oldAmount, newAmount);
            } else if (functionSelector == IExecutorHelper.executeAlgebraV1.selector) {
                swap.data = newAlgebraV1(swap.data, oldAmount, newAmount);
            } else if (functionSelector == IExecutorHelper.executeBalancerBatch.selector) {
                swap.data = newBalancerBatch(swap.data, oldAmount, newAmount);
            } else if (functionSelector == IExecutorHelper.executeWombat.selector) {
                swap.data = newMantis(swap.data, oldAmount, newAmount); // @dev struct Mantis is used for both Wombat and Mantis because of same fields
            } else if (functionSelector == IExecutorHelper.executeMantis.selector) {
                swap.data = newMantis(swap.data, oldAmount, newAmount);
            } else if (functionSelector == IExecutorHelper.executeIziSwap.selector) {
                swap.data = newIziSwap(swap.data, oldAmount, newAmount);
            } else if (functionSelector == IExecutorHelper.executeWooFiV2.selector) {
                swap.data = newMantis(swap.data, oldAmount, newAmount); // @dev using Mantis struct because WooFiV2 and Mantis have same fields
            } else if (functionSelector == IExecutorHelper.executeTraderJoeV2.selector) {
                swap.data = newTraderJoeV2(swap.data, oldAmount, newAmount);
            } else if (functionSelector == IExecutorHelper.executePancakeStableSwap.selector) {
                swap.data = newCurveSwap(swap.data, oldAmount, newAmount);
            } else if (functionSelector == IExecutorHelper.executeLevelFiV2.selector) {
                swap.data = newLevelFiV2(swap.data, oldAmount, newAmount);
            } else if (functionSelector == IExecutorHelper.executeGMXGLP.selector) {
                swap.data = newGMXGLP(swap.data, oldAmount, newAmount);
            } else if (functionSelector == IExecutorHelper.executeVooi.selector) {
                swap.data = newVooi(swap.data, oldAmount, newAmount);
            } else if (functionSelector == IExecutorHelper.executeVelocoreV2.selector) {
                swap.data = newVelocoreV2(swap.data, oldAmount, newAmount);
            } else if (functionSelector == IExecutorHelper.executeMaticMigrate.selector) {
                swap.data = newMaticMigrate(swap.data, oldAmount, newAmount);
            } else if (functionSelector == IExecutorHelper.executeSmardex.selector) {
                swap.data = newMantis(swap.data, oldAmount, newAmount); // @dev using Mantis struct because Smardex and Mantis have same fields
            } else if (functionSelector == IExecutorHelper.executeSolidlyV2.selector) {
                swap.data = newMantis(swap.data, oldAmount, newAmount); // @dev using Mantis struct because Solidly V2 and Mantis have same fields
            } else if (functionSelector == IExecutorHelper.executeKokonut.selector) {
                swap.data = newKokonut(swap.data, oldAmount, newAmount);
            } else if (functionSelector == IExecutorHelper.executeBalancerV1.selector) {
                swap.data = newBalancerV1(swap.data, oldAmount, newAmount);
            } else if (functionSelector == IExecutorHelper.executeSwaapV2.selector) {
                revert("InputScalingHelper: Can not scale SwaapV2 swap");
            } else if (functionSelector == IExecutorHelper.executeNomiswapStable.selector) {
                swap.data = newMantis(swap.data, oldAmount, newAmount); // @dev using Mantis struct because NomiswapV2 and Mantis have same fields
            } else if (functionSelector == IExecutorHelper.executeArbswapStable.selector) {
                swap.data = newArbswapStable(swap.data, oldAmount, newAmount);
            } else if (functionSelector == IExecutorHelper.executeBancorV2.selector) {
                swap.data = newBancorV2(swap.data, oldAmount, newAmount);
            } else if (functionSelector == IExecutorHelper.executeBancorV3.selector) {
                swap.data = newMantis(swap.data, oldAmount, newAmount); // @dev using Mantis struct because Bancor V3 and Mantis have same fields
            } else if (functionSelector == IExecutorHelper.executeAmbient.selector) {
                swap.data = newAmbient(swap.data, oldAmount, newAmount);
            } else if (functionSelector == IExecutorHelper.executeNative.selector) {
                revert("InputScalingHelper: Can not scale Native swap");
            } else if (functionSelector == IExecutorHelper.executeLighterV2.selector) {
                swap.data = newLighterV2(swap.data, oldAmount, newAmount);
            } else if (functionSelector == IExecutorHelper.executeBebop.selector) {
                revert("InputScalingHelper: Can not scale Bebop swap");
            } else if (functionSelector == IExecutorHelper.executeUniV1.selector) {
                swap.data = newUniV1(swap.data, oldAmount, newAmount);
            } else if (functionSelector == IExecutorHelper.executeEtherFieETH.selector) {
                swap.data = newEtherFieETH(swap.data, oldAmount, newAmount);
            } else if (functionSelector == IExecutorHelper.executeEtherFiWeETH.selector) {
                swap.data = newEtherFiWeETH(swap.data, oldAmount, newAmount);
            } else if (functionSelector == IExecutorHelper.executeKelp.selector) {
                swap.data = newKelp(swap.data, oldAmount, newAmount);
            } else if (functionSelector == IExecutorHelper.executeEthenaSusde.selector) {
                swap.data = newEthenaSusde(swap.data, oldAmount, newAmount);
            } else if (functionSelector == IExecutorHelper.executeRocketPool.selector) {
                swap.data = newRocketPool(swap.data, oldAmount, newAmount);
            } else if (functionSelector == IExecutorHelper.executeMakersDAI.selector) {
                swap.data = newMakersDAI(swap.data, oldAmount, newAmount);
            } else {
                revert("AggregationExecutor: Dex type not supported");
            }
            unchecked {
                ++i;
            }
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
        IExecutorHelper.UniswapV3KSElastic memory uniSwapV3ProMM = abi.decode(
            data,
            (IExecutorHelper.UniswapV3KSElastic)
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

    function newStETHSwap(
        bytes memory data,
        uint256 oldAmount,
        uint256 newAmount
    ) internal pure returns (bytes memory) {
        uint256 amount = abi.decode(data, (uint256));
        amount = (amount * newAmount) / oldAmount;
        return abi.encode(amount);
    }

    function newMaverick(
        bytes memory data,
        uint256 oldAmount,
        uint256 newAmount
    ) internal pure returns (bytes memory) {
        IExecutorHelper.Maverick memory maverick = abi.decode(data, (IExecutorHelper.Maverick));
        maverick.swapAmount = (maverick.swapAmount * newAmount) / oldAmount;
        return abi.encode(maverick);
    }

    function newSyncSwap(
        bytes memory data,
        uint256 oldAmount,
        uint256 newAmount
    ) internal pure returns (bytes memory) {
        IExecutorHelper.SyncSwap memory syncSwap = abi.decode(data, (IExecutorHelper.SyncSwap));
        syncSwap.collectAmount = (syncSwap.collectAmount * newAmount) / oldAmount;
        return abi.encode(syncSwap);
    }

    function newAlgebraV1(
        bytes memory data,
        uint256 oldAmount,
        uint256 newAmount
    ) internal pure returns (bytes memory) {
        IExecutorHelper.AlgebraV1 memory algebraV1Swap = abi.decode(
            data,
            (IExecutorHelper.AlgebraV1)
        );
        algebraV1Swap.swapAmount = (algebraV1Swap.swapAmount * newAmount) / oldAmount;
        return abi.encode(algebraV1Swap);
    }

    function newBalancerBatch(
        bytes memory data,
        uint256 oldAmount,
        uint256 newAmount
    ) internal pure returns (bytes memory) {
        IExecutorHelper.BalancerBatch memory balancerBatch = abi.decode(
            data,
            (IExecutorHelper.BalancerBatch)
        );
        balancerBatch.amountIn = (balancerBatch.amountIn * newAmount) / oldAmount;
        return abi.encode(balancerBatch);
    }

    function newMantis(
        bytes memory data,
        uint256 oldAmount,
        uint256 newAmount
    ) internal pure returns (bytes memory) {
        IExecutorHelper.Mantis memory mantis = abi.decode(data, (IExecutorHelper.Mantis));
        mantis.amount = (mantis.amount * newAmount) / oldAmount;
        return abi.encode(mantis);
    }

    function newIziSwap(
        bytes memory data,
        uint256 oldAmount,
        uint256 newAmount
    ) internal pure returns (bytes memory) {
        IExecutorHelper.IziSwap memory iZi = abi.decode(data, (IExecutorHelper.IziSwap));
        iZi.swapAmount = (iZi.swapAmount * newAmount) / oldAmount;
        return abi.encode(iZi);
    }

    function newTraderJoeV2(
        bytes memory data,
        uint256 oldAmount,
        uint256 newAmount
    ) internal pure returns (bytes memory) {
        IExecutorHelper.TraderJoeV2 memory traderJoe = abi.decode(
            data,
            (IExecutorHelper.TraderJoeV2)
        );

        // traderJoe.collectAmount; // most significant 1 bit is to determine whether pool is v2.1, else v2.0
        traderJoe.collectAmount =
            (traderJoe.collectAmount & (1 << 255)) |
            ((uint256((traderJoe.collectAmount << 1) >> 1) * newAmount) / oldAmount);
        return abi.encode(traderJoe);
    }

    function newLevelFiV2(
        bytes memory data,
        uint256 oldAmount,
        uint256 newAmount
    ) internal pure returns (bytes memory) {
        IExecutorHelper.LevelFiV2 memory levelFiV2 = abi.decode(data, (IExecutorHelper.LevelFiV2));
        levelFiV2.amountIn = (levelFiV2.amountIn * newAmount) / oldAmount;
        return abi.encode(levelFiV2);
    }

    function newGMXGLP(
        bytes memory data,
        uint256 oldAmount,
        uint256 newAmount
    ) internal pure returns (bytes memory) {
        IExecutorHelper.GMXGLP memory swapData = abi.decode(data, (IExecutorHelper.GMXGLP));
        swapData.swapAmount = (swapData.swapAmount * newAmount) / oldAmount;
        return abi.encode(swapData);
    }

    function newVooi(
        bytes memory data,
        uint256 oldAmount,
        uint256 newAmount
    ) internal pure returns (bytes memory) {
        IExecutorHelper.Vooi memory vooi = abi.decode(data, (IExecutorHelper.Vooi));
        vooi.fromAmount = (vooi.fromAmount * newAmount) / oldAmount;
        return abi.encode(vooi);
    }

    function newVelocoreV2(
        bytes memory data,
        uint256 oldAmount,
        uint256 newAmount
    ) internal pure returns (bytes memory) {
        IExecutorHelper.VelocoreV2 memory velocorev2 = abi.decode(
            data,
            (IExecutorHelper.VelocoreV2)
        );
        velocorev2.amount = (velocorev2.amount * newAmount) / oldAmount;
        return abi.encode(velocorev2);
    }

    function newMaticMigrate(
        bytes memory data,
        uint256 oldAmount,
        uint256 newAmount
    ) internal pure returns (bytes memory) {
        IExecutorHelper.MaticMigrate memory maticMigrate = abi.decode(
            data,
            (IExecutorHelper.MaticMigrate)
        );
        maticMigrate.amount = (maticMigrate.amount * newAmount) / oldAmount;
        return abi.encode(maticMigrate);
    }

    function newKokonut(
        bytes memory data,
        uint256 oldAmount,
        uint256 newAmount
    ) internal pure returns (bytes memory) {
        IExecutorHelper.Kokonut memory kokonut = abi.decode(data, (IExecutorHelper.Kokonut));
        kokonut.dx = (kokonut.dx * newAmount) / oldAmount;
        return abi.encode(kokonut);
    }

    function newBalancerV1(
        bytes memory data,
        uint256 oldAmount,
        uint256 newAmount
    ) internal pure returns (bytes memory) {
        IExecutorHelper.BalancerV1 memory balancerV1 = abi.decode(
            data,
            (IExecutorHelper.BalancerV1)
        );
        balancerV1.amount = (balancerV1.amount * newAmount) / oldAmount;
        return abi.encode(balancerV1);
    }

    function newArbswapStable(
        bytes memory data,
        uint256 oldAmount,
        uint256 newAmount
    ) internal pure returns (bytes memory) {
        IExecutorHelper.ArbswapStable memory arbswapStable = abi.decode(
            data,
            (IExecutorHelper.ArbswapStable)
        );
        arbswapStable.dx = (arbswapStable.dx * newAmount) / oldAmount;
        return abi.encode(arbswapStable);
    }

    function newBancorV2(
        bytes memory data,
        uint256 oldAmount,
        uint256 newAmount
    ) internal pure returns (bytes memory) {
        IExecutorHelper.BancorV2 memory bancorV2 = abi.decode(data, (IExecutorHelper.BancorV2));
        bancorV2.amount = (bancorV2.amount * newAmount) / oldAmount;
        return abi.encode(bancorV2);
    }

    function newAmbient(
        bytes memory data,
        uint256 oldAmount,
        uint256 newAmount
    ) internal pure returns (bytes memory) {
        IExecutorHelper.Ambient memory ambient = abi.decode(data, (IExecutorHelper.Ambient));
        ambient.qty = uint128((uint256(ambient.qty) * newAmount) / oldAmount);
        return abi.encode(ambient);
    }

    function newLighterV2(
        bytes memory data,
        uint256 oldAmount,
        uint256 newAmount
    ) internal pure returns (bytes memory) {
        IExecutorHelper.LighterV2 memory structData = abi.decode(data, (IExecutorHelper.LighterV2));
        structData.amount = uint128((uint256(structData.amount) * newAmount) / oldAmount);
        return abi.encode(structData);
    }

    function newUniV1(
        bytes memory data,
        uint256 oldAmount,
        uint256 newAmount
    ) internal pure returns (bytes memory) {
        IExecutorHelper.UniV1 memory structData = abi.decode(data, (IExecutorHelper.UniV1));
        structData.amount = uint128((uint256(structData.amount) * newAmount) / oldAmount);
        return abi.encode(structData);
    }

    function newEtherFieETH(
        bytes memory data,
        uint256 oldAmount,
        uint256 newAmount
    ) internal pure returns (bytes memory) {
        uint256 depositAmount = abi.decode(data, (uint256));
        depositAmount = uint128((depositAmount * newAmount) / oldAmount);
        return abi.encode(depositAmount);
    }

    function newEtherFiWeETH(
        bytes memory data,
        uint256 oldAmount,
        uint256 newAmount
    ) internal pure returns (bytes memory) {
        IExecutorHelper.EtherFiWeETH memory structData = abi.decode(
            data,
            (IExecutorHelper.EtherFiWeETH)
        );
        structData.amount = uint128((uint256(structData.amount) * newAmount) / oldAmount);
        return abi.encode(structData);
    }

    function newKelp(
        bytes memory data,
        uint256 oldAmount,
        uint256 newAmount
    ) internal pure returns (bytes memory) {
        IExecutorHelper.Kelp memory structData = abi.decode(data, (IExecutorHelper.Kelp));
        structData.amount = uint128((uint256(structData.amount) * newAmount) / oldAmount);
        return abi.encode(structData);
    }

    function newEthenaSusde(
        bytes memory data,
        uint256 oldAmount,
        uint256 newAmount
    ) internal pure returns (bytes memory) {
        IExecutorHelper.EthenaSusde memory structData = abi.decode(
            data,
            (IExecutorHelper.EthenaSusde)
        );
        structData.amount = uint128((uint256(structData.amount) * newAmount) / oldAmount);
        return abi.encode(structData);
    }

    function newRocketPool(
        bytes memory data,
        uint256 oldAmount,
        uint256 newAmount
    ) internal pure returns (bytes memory) {
        IExecutorHelper.RocketPool memory structData = abi.decode(
            data,
            (IExecutorHelper.RocketPool)
        );
        uint128 _amount = uint128(
            (uint256(uint128(structData.isDepositAndAmount)) * newAmount) / oldAmount
        );
        structData.isDepositAndAmount |= uint256(_amount);
        return abi.encode(structData);
    }

    function newMakersDAI(
        bytes memory data,
        uint256 oldAmount,
        uint256 newAmount
    ) internal pure returns (bytes memory) {
        IExecutorHelper.MakersDAI memory structData = abi.decode(data, (IExecutorHelper.MakersDAI));
        uint128 _amount = uint128(
            (uint256(uint128(structData.isRedeemAndAmount)) * newAmount) / oldAmount
        );
        structData.isRedeemAndAmount |= uint256(_amount);
        return abi.encode(structData);
    }

    function _scaledPositiveSlippageFeeData(
        bytes memory data,
        uint256 oldAmount,
        uint256 newAmount
    ) internal pure returns (bytes memory newData) {
        if (data.length > 32) {
            PositiveSlippageFeeData memory psData = abi.decode(data, (PositiveSlippageFeeData));
            uint256 left = uint256(psData.expectedReturnAmount >> 128);
            uint256 right = (uint256(uint128(psData.expectedReturnAmount)) * newAmount) / oldAmount;
            require(right <= type(uint128).max, "Exceeded type range");
            psData.expectedReturnAmount = right | (left << 128);
            data = abi.encode(psData);
        } else if (data.length == 32) {
            uint256 expectedReturnAmount = abi.decode(data, (uint256));
            uint256 left = uint256(expectedReturnAmount >> 128);
            uint256 right = (uint256(uint128(expectedReturnAmount)) * newAmount) / oldAmount;
            require(right <= type(uint128).max, "Exceeded type range");
            expectedReturnAmount = right | (left << 128);
            data = abi.encode(expectedReturnAmount);
        }
        return data;
    }

    function _flagsChecked(uint256 number, uint256 flag) internal pure returns (bool) {
        return number & flag != 0;
    }
}
