

import { IFluidVaultT1 } from "../../../contracts/interfaces/fluid/IFluidVaultT1.sol";
import { IFluidVaultResolver } from "../../../contracts/interfaces/fluid/IFluidVaultResolver.sol";
import { IFluidVaultFactory } from "../../../contracts/interfaces/fluid/IFluidVaultFactory.sol";

import { FluidTestHelper } from "../../actions/fluid/FluidTestHelper.t.sol";
import { ExecuteActionsBase } from "./ExecuteActionsBase.sol";
import { SmartWallet } from "../SmartWallet.sol";
import { Vm } from "forge-std/Vm.sol";

contract FluidExecuteActions is ExecuteActionsBase, FluidTestHelper {

    error NftNotFound();

    function executeFluidVaultT1Open(
        address _vault,
        uint256 _collAmountInUSD,
        uint256 _borrowAmountInUSD,
        SmartWallet _wallet,
        address _openContract
    ) internal returns (uint256 nftId) {
        IFluidVaultT1.ConstantViews memory constants = IFluidVaultT1(_vault).constantsView();
        uint256 collAmount = amountInUSDPrice(constants.supplyToken, _collAmountInUSD);
        give(constants.supplyToken, _wallet.owner(), collAmount);
        _wallet.ownerApprove(constants.supplyToken, collAmount);

        uint256 borrowAmount = _borrowAmountInUSD != 0
                ? amountInUSDPrice(constants.borrowToken, _borrowAmountInUSD)
                : 0;

        bytes memory executeActionCallData = executeActionCalldata(
            fluidVaultT1OpenEncode(
                _vault,
                collAmount,
                borrowAmount,
                _wallet.owner(),
                _wallet.owner()
            ),
            true
        );

        vm.recordLogs();
        _wallet.execute(_openContract, executeActionCallData, 0);
        Vm.Log[] memory logs = vm.getRecordedLogs();

        for (uint256 i = 0; i < logs.length; ++i) {
            if (logs[i].topics[0] == IFluidVaultFactory.NewPositionMinted.selector) {
                nftId = uint256(logs[i].topics[3]);
                return nftId;
            }
        }

        revert NftNotFound();
    }
}