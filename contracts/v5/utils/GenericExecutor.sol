// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

contract GenericExecutor {
    event Debug(
        address caller,
        address self,
        address token,
        address to,
        uint256 amount
    );

    // MANTIDO IGUAL
    function execute(address token, address to, uint256 amount) external {
        (bool ok, ) = token.call(
            abi.encodeWithSignature(
                "transfer(address,uint256)",
                to,
                amount
            )
        );

        require(ok, "transfer failed");
    }

    // NOVO: debug sem alterar execute
    function executeDebug(
        address token,
        address to,
        uint256 amount
    ) external {
        emit Debug(
            msg.sender,
            address(this),
            token,
            to,
            amount
        );

        (bool ok, ) = token.call(
            abi.encodeWithSignature(
                "transfer(address,uint256)",
                to,
                amount
            )
        );

        require(ok, "transfer failed");
    }
}