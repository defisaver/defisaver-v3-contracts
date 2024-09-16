// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { EulerV2Helper } from "../../../contracts/actions/eulerV2/helpers/EulerV2Helper.sol";
import { IPerspective } from "../../../contracts/interfaces/eulerV2/IPerspective.sol";
import {EulerV2PositionCreator} from "../../utils/positions/EulerV2PositionCreator.sol";

contract EulerV2TestHelper is EulerV2Helper, EulerV2PositionCreator {

    address constant ESCROWED_COLLATERAL_PERSPECTIVE = 0xc68CB3658ACf1d49547Fa8605dc158D876cD5828;
    address constant GOVERNED_PERSPECTIVE = 0xC0121817FF224a018840e4D15a864747d36e6Eb2;
    address constant UNGOVERNED_0X_PERSPECTIVE = 0x5345562eD3Ce537582A1A568d3B06c8382Cd60BD;

    address constant E_WETH_2_GOVERNED = 0xD8b27CF359b7D15710a5BE299AF6e7Bf904984C2;
    address constant E_WSTETH_2_GOVERNED = 0xbC4B4AC47582c3E38Ce5940B80Da65401F4628f1;
    address constant E_USDC_2_GOVERNED = 0x797DD80692c3b2dAdabCe8e30C07fDE5307D48a9;

    address constant E_WSTETH_1_ESCROWED = 0xF6E2EfDF175e7a91c8847dade42f2d39A9aE57D4;
    address constant E_WETH_1_ESCROWED = 0xb3b36220fA7d12f7055dab5c9FD18E860e9a6bF8;
    address constant E_USDC_1_ESCROWED = 0xB93d4928f39fBcd6C89a7DFbF0A867E6344561bE;

    function getEscrowedCollateralVaults() internal view returns (address[] memory) {
        return IPerspective(ESCROWED_COLLATERAL_PERSPECTIVE).verifiedArray();
    }

    function getGovernedVaults() internal view returns (address[] memory) {
        return IPerspective(GOVERNED_PERSPECTIVE).verifiedArray();
    }

    function getSubAccount(
        address _mainAccount,
        bytes1 _subAccountNumber
    ) internal pure returns (address subAccount) {
        bytes19 accountPrefix = getAddressPrefixInternal(_mainAccount);
        subAccount = address(uint160(bytes20(abi.encodePacked(accountPrefix, _subAccountNumber))));
    }
}