// test/Token.test.js
// SPDX-License-Identifier: MIT

// Based on https://github.com/OpenZeppelin/openzeppelin-solidity/blob/v2.5.1/test/examples/SimpleToken.test.js

const { expect } = require('chai');

// Import utilities from Test Helpers
const { BN, expectEvent, expectRevert, constants } = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = require('@openzeppelin/test-helpers/src/constants');

// Load compiled artifacts
const MexdToken = artifacts.require('Token');

// Start test block 
contract('Token', function (accounts) {

  const creator = accounts[0];
  const recipient = accounts[1];
  const NAME = 'MEX DIGITAL';
  const SYMBOL = 'MEXD';
  const DECIMALS = new BN('18');
  const TOTAL_SUPPLY = new BN('1000000000000000000000000000'); //1000000000 * 10 ** 18
  const someAmount = new BN('200000');

  beforeEach(async function () {
    this.token = await MexdToken.new({ from: creator });
  });

  it('retrieve returns a value previously stored', async function () {
    // Use large integer comparisons
    expect(await this.token.totalSupply()).to.be.bignumber.equal(TOTAL_SUPPLY);
  });

  it('has a name', async function () {
    expect(await this.token.name()).to.be.equal(NAME);
  });

  it('has a symbol', async function () {
    expect(await this.token.symbol()).to.be.equal(SYMBOL);
  });

  it('has owner', async function () {
    expect(await this.token.getOwner()).to.be.equal(creator);
  });

  it('has 18 decimals', async function () {
    expect(await this.token.decimals()).to.be.bignumber.equal(DECIMALS);
  });

  it('assigns the initial total supply to the creator', async function () {
    expect(await this.token.balanceOf(creator)).to.be.bignumber.equal(TOTAL_SUPPLY);
  });

  it('assigns the initial total supply to the recipient', async function () {
    expect(await this.token.balanceOf(recipient)).to.be.bignumber.equal(new BN("0"));
  });

  describe('ownership', function () {
    describe('transfer', function () {
      it('success', async function () {
        await this.token.transferOwnership(recipient, { from: creator });
        expect(await this.token.getOwner()).to.be.equal(recipient);
      });
    
      it('fail', async function () {
        await expectRevert(this.token.transferOwnership(recipient, { from: recipient }), 'Ownable: caller is not the owner') ;
      });
    });
    describe('renounce', function () {
      it('success', async function () {
        await this.token.renounceOwnership({ from: creator });
        expect(await this.token.getOwner()).to.be.equal(ZERO_ADDRESS);
      });
    });
  });
  
  describe('transfer token', function () {
    describe('when there is enough balance', function () {
      it('transfer all tokens', async function () {
        await this.token.transfer(recipient, TOTAL_SUPPLY, { from: creator });
        expect(await this.token.balanceOf(recipient)).to.be.bignumber.equal(TOTAL_SUPPLY);
      });
    
      it('transfer some tokens', async function () {
        await this.token.transfer(recipient, someAmount, { from: creator });
        expect(await this.token.balanceOf(recipient)).to.be.bignumber.equal(someAmount);
      });
    });
    describe('when there is enough balance', function () {
      it('reverts', async function () {
        await expectRevert(
          this.token.transfer(creator, someAmount, { from: recipient }), 'ERC20: transfer amount exceeds balance',
        );
      });
    });
    describe('when the receiver is the zero address', function () {
      it('reverts', async function () {
        await expectRevert(
          this.token.transfer(ZERO_ADDRESS, someAmount, {from: recipient}),'transfer to the zero address',
        );
      });
    });
  });

  describe('increase allowance', function () {
    const amount = TOTAL_SUPPLY;// initialSupply;

    describe('when the spender is not the zero address', function () {
      const spender = recipient;

      describe('when the sender has enough balance', function () {
        it('emits an approval event', async function () {
          const { logs } = await this.token.increaseAllowance(spender, amount, { from: creator });

          expectEvent.inLogs(logs, 'Approval', {
            owner: creator,
            spender: spender,
            value: amount,
          });
        });

        describe('when there was no approved amount before', function () {
          it('approves the requested amount', async function () {
            await this.token.increaseAllowance(spender, amount, { from: creator });

            expect(await this.token.allowance(creator, spender)).to.be.bignumber.equal(amount);
          });
        });

        describe('when the spender had an approved amount', function () {
          beforeEach(async function () {
            await this.token.approve(spender, new BN(1), { from: creator });
          });

          it('increases the spender allowance adding the requested amount', async function () {
            await this.token.increaseAllowance(spender, amount, { from: creator });

            expect(await this.token.allowance(creator, spender)).to.be.bignumber.equal(amount.addn(1));
          });
        });
      });

      describe('when the sender does not have enough balance', function () {
        const amount = TOTAL_SUPPLY.addn(1);

        it('emits an approval event', async function () {
          const { logs } = await this.token.increaseAllowance(spender, amount, { from: creator });

          expectEvent.inLogs(logs, 'Approval', {
            owner: creator,
            spender: spender,
            value: amount,
          });
        });

        describe('when there was no approved amount before', function () {
          it('approves the requested amount', async function () {
            await this.token.increaseAllowance(spender, amount, { from: creator });

            expect(await this.token.allowance(creator, spender)).to.be.bignumber.equal(amount);
          });
        });

        describe('when the spender had an approved amount', function () {
          beforeEach(async function () {
            await this.token.approve(spender, new BN(1), { from: creator });
          });

          it('increases the spender allowance adding the requested amount', async function () {
            await this.token.increaseAllowance(spender, amount, { from: creator });

            expect(await this.token.allowance(creator, spender)).to.be.bignumber.equal(amount.addn(1));
          });
        });
      });
    });

    describe('when the spender is the zero address', function () {
      const spender = ZERO_ADDRESS;

      it('reverts', async function () {
        await expectRevert(
          this.token.increaseAllowance(spender, amount, { from: creator }), 'ERC20: approve to the zero address',
        );
      });
    });
  });

  describe('decrease allowance', function () {
    describe('when the spender is not the zero address', function () {
      const spender = recipient;

      function shouldDecreaseApproval (amount) {
        describe('when there was no approved amount before', function () {
          it('reverts', async function () {
            await expectRevert(this.token.decreaseAllowance(
              spender, amount, { from: creator }), 'ERC20: decreased allowance below zero',
            );
          });
        });

        describe('when the spender had an approved amount', function () {
          const approvedAmount = amount;

          beforeEach(async function () {
            ({ logs: this.logs } = await this.token.approve(spender, approvedAmount, { from: creator }));
          });

          it('emits an approval event', async function () {
            const { logs } = await this.token.decreaseAllowance(spender, approvedAmount, { from: creator });

            expectEvent.inLogs(logs, 'Approval', {
              owner: creator,
              spender: spender,
              value: new BN(0),
            });
          });

          it('decreases the spender allowance subtracting the requested amount', async function () {
            await this.token.decreaseAllowance(spender, approvedAmount.subn(1), { from: creator });

            expect(await this.token.allowance(creator, spender)).to.be.bignumber.equal('1');
          });

          it('sets the allowance to zero when all allowance is removed', async function () {
            await this.token.decreaseAllowance(spender, approvedAmount, { from: creator });
            expect(await this.token.allowance(creator, spender)).to.be.bignumber.equal('0');
          });

          it('reverts when more than the full allowance is removed', async function () {
            await expectRevert(
              this.token.decreaseAllowance(spender, approvedAmount.addn(1), { from: creator }),
              'ERC20: decreased allowance below zero',
            );
          });
        });
      }

      describe('when the sender has enough balance', function () {
        const amount = TOTAL_SUPPLY;

        shouldDecreaseApproval(amount);
      });

      describe('when the sender does not have enough balance', function () {
        const amount = TOTAL_SUPPLY.addn(1);

        shouldDecreaseApproval(amount);
      });
    });

    describe('when the spender is the zero address', function () {
      const amount = TOTAL_SUPPLY;
      const spender = ZERO_ADDRESS;

      it('reverts', async function () {
        await expectRevert(this.token.decreaseAllowance(
          spender, amount, { from: creator }), 'ERC20: decreased allowance below zero',
        );
      });
    });
  });
});

