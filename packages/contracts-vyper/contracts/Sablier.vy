import IERC1620 as foobar
from vyper.interfaces import ERC20

#   @title Sablier - ERC Money Streaming Implementation
#   @author Paul Berg - <hello@paulrberg.com>


#    Types     

struct Timeframe: 
     start: uint256
     stopTime: uint256
struct Rate:
     payment: uint256
     interval: uint256
struct Stream:
     sender: address
     recipient: address
     tokenAddress: address
     timeframe: Timeframe
     rate: Rate
     balanceStream: uint256

#   Events


CreateStream: event({streamId: indexed(uint256), sender: indexed(address), recipient: indexed(address), tokenAddress: address, startBlock: uint256, stopBlock: uint256, payment: uint256, interval: uint256, deposit: uint256})

WithdrawFromStream: event({streamId: indexed(uint256), recipient: indexed(address), amount: uint256})

RedeemStream: event({ streamId: indexed(uint256), sender: indexed(address), recipient: indexed(address), senderAmount: uint256, recipientAmount: uint256})

ConfirmUpdate: event({ streamId: indexed(uint256), confirmer: indexed(address), newTokenAddress: address, newStopBlock: uint256, newPayment: uint256, newInterval: uint256})

RevokeUpdate: event({ streamId: indexed(uint256), revoker: indexed(address), newTokenAddress: address, newStopBlock: uint256,
newPayment: uint256, newInterval: uint256})

ExecuteUpdate: event({ streamId: indexed(uint256), sender: indexed(address), recipient: indexed(address), newTokenAddress: address, newStopBlock: uint256, newPayment: uint256, newInterval: uint256})

#    Storage


streams: map(uint256, Stream)
streamNonce: uint256
updates: map(uint256, map(address, bool))

ERC20_contract: ERC20

#   Functions

@public
def __init__():
	self.streamNonce = 1


@constant
@private
def verifyTerms(_tokenAddress: address, _startBlock: uint256, _stopBlock: uint256, _interval: uint256) -> bool:
		assert _tokenAddress != ZERO_ADDRESS, "token contract address needs to be provided"
		assert _startBlock >= block.number, "the start block needs to be higher than the current block number"
		assert _stopBlock > _startBlock, "the stop block needs to be higher than the start block"

		delta: uint256 = _stopBlock - _startBlock

		assert delta >= _interval, "the block difference needs to be higher than the payment interval"
		assert delta % _interval == 0, "the block difference needs to be a multiple of the payment interval"
		return True

@constant
@private
def onlyNewTerms(_streamId: uint256, _tokenAddress: address, _stopBlock: uint256, _payment: uint256, _interval:uint256) -> bool:

	    assert self.streams[_streamId].tokenAddress != _tokenAddress or  self.streams[_streamId].timeframe.stopTime != _stopBlock or \

            self.streams[_streamId].rate.payment != _payment or self.streams[_streamId].rate.interval != _interval, \
            "stream has these terms already"
	    return True


@constant
@private
def depositOf(_streamId: uint256) -> uint256:
	return (self.streams[_streamId].timeframe.stopTime - self.streams[_streamId].timeframe.start) / self.streams[_streamId].rate.interval * self.streams[_streamId].rate.payment 

@constant
@private
def deltaOf(_streamId: uint256) -> uint256:
	startBlock: uint256 = self.streams[_streamId].timeframe.start
	stopBlock: uint256 = self.streams[_streamId].timeframe.stopTime

	if block.number <= startBlock:
		return 0

	if block.number <= stopBlock:
		return block.number - startBlock

	return stopBlock - startBlock


@public
def revokeUpdate(_streamId: uint256, _tokenAddress: address, _stopBlock: uint256, _payment:uint256, _interval: uint256):
	assert self.updates[_streamId][msg.sender] == True, "msg.sender has not confirmed the update"

	log.RevokeUpdate(_streamId, msg.sender, _tokenAddress, _stopBlock, _payment, _interval)
	self.updates[_streamId][msg.sender] = False



@public
@constant
def balanceOf(_streamId: uint256, _addr: address) -> uint256:
	assert self.streams[_streamId].sender != ZERO_ADDRESS, "stream doesn't exist"

	deposit: uint256 = self.depositOf(_streamId)
	delta: uint256 = self.deltaOf(_streamId)
	funds: uint256 = delta / self.streams[_streamId].rate.interval * self.streams[_streamId].rate.payment
	
	if self.streams[_streamId].balanceStream != deposit:
		funds = funds - ( deposit - self.streams[_streamId].balanceStream )

	if _addr == self.streams[_streamId].recipient:
		return funds

	elif _addr == self.streams[_streamId].sender:
		return self.streams[_streamId].balanceStream - funds

	else:
		return 0

@public
def redeemStream(_streamId: uint256):
        assert self.streams[_streamId].sender != ZERO_ADDRESS, "stream doesn't exist"
        assert msg.sender == self.streams[_streamId].sender or msg.sender == self.streams[_streamId].recipient, "only the sender or the recipient of the stream can perform this action"

        senderAmount: uint256 = self.balanceOf(_streamId, self.streams[_streamId].sender)
        recipientAmount: uint256 = self.balanceOf(_streamId, self.streams[_streamId].recipient)
        log.RedeemStream(_streamId, self.streams[_streamId].sender, self.streams[_streamId].recipient, senderAmount, recipientAmount)

        #saving gas
        clear(self.streams[_streamId])

        self.updates[_streamId][self.streams[_streamId].sender] = False
        self.updates[_streamId][self.streams[_streamId].recipient] = False

        self.ERC20_contract = ERC20(self.streams[_streamId].tokenAddress)

        if recipientAmount > 0:
                send(self.streams[_streamId].recipient, recipientAmount)

        if senderAmount > 0 :
                send( self.streams[_streamId].sender, senderAmount)


@public
def createStream( _sender: address, _recipient: address, _tokenAddress: address, _startBlock: uint256, _stopBlock: uint256, _payment: uint256, _interval: uint256):
	self.verifyTerms(_tokenAddress, _startBlock, _stopBlock, _interval)

	deposit: uint256 = (_stopBlock - _startBlock) / _interval * _payment
	self.ERC20_contract = ERC20(_tokenAddress)
	allowance: uint256 = self.ERC20_contract.allowance(_sender, self)
	assert allowance >= deposit, "contract not allowed to transfer enough tokens"

	self.streams[self.streamNonce] = Stream({ sender: _sender, recipient: _recipient, tokenAddress: _tokenAddress, timeframe: Timeframe({ start: _startBlock, stopTime: _stopBlock}), rate: Rate({payment:_payment,interval: _interval} ), balanceStream: deposit}) 
	
	log.CreateStream(self.streamNonce, _sender, _recipient, _tokenAddress, _startBlock, _stopBlock, _payment, _interval, deposit)
	self.streamNonce += 1
	
	self.ERC20_contract.transferFrom(_sender, self, deposit)



@private
def executeUpdate(_streamId: uint256, _tokenAddress: address, _stopBlock: uint256, _payment: uint256, _interval: uint256):
	assert self.streams[_streamId].sender != ZERO_ADDRESS, "stream doesn't exist"

	if self.updates[_streamId][self.streams[_streamId].sender] == False:
		return

	if self.updates[_streamId][self.streams[_streamId].recipient] == False:
		return
	
	remainder: uint256 = (_stopBlock - block.number ) % _interval
	adjustedStopBlock: uint256 = _stopBlock - remainder
	log.ExecuteUpdate(_streamId, self.streams[_streamId].sender, self.streams[_streamId].recipient, _tokenAddress, adjustedStopBlock, _payment, _interval)
	self.updates[_streamId][self.streams[_streamId].sender] = False
	self.updates[_streamId][self.streams[_streamId].recipient] = False

	self.redeemStream(_streamId)
	self.createStream(self.streams[_streamId].sender, self.streams[_streamId].recipient, _tokenAddress, block.number, adjustedStopBlock, _payment, _interval)



@public
def confirmUpdate( _streamId: uint256, _tokenAddress: address, _stopBlock: uint256, _payment: uint256, _interval: uint256):
	assert self.streams[_streamId].sender != ZERO_ADDRESS, "stream doesn't exist"
	assert msg.sender == self.streams[_streamId].sender or msg.sender == self.streams[_streamId].recipient, "only the sender or the recipient of the stream can perform this action"

	self.onlyNewTerms(_streamId, _tokenAddress, _stopBlock, _payment, _interval)
	self.verifyTerms(_tokenAddress, block.number, _stopBlock, _interval)
	log.ConfirmUpdate(_streamId, msg.sender, _tokenAddress, _stopBlock, _payment, _interval)
	self.updates[_streamId][msg.sender] = True
	self.executeUpdate(_streamId, _tokenAddress, _stopBlock, _payment, _interval)


@public
def withdrawFromStream( _streamId: uint256, _amount: uint256):
	assert self.streams[_streamId].sender != ZERO_ADDRESS, "stream doesn't exist"
	assert msg.sender == self.streams[_streamId].recipient, "only the stream recipient is allowed to perform this action"

	availableFunds: uint256 = self.balanceOf(_streamId,  self.streams[_streamId].recipient)
	assert availableFunds >= _amount, "not enough funds"

	self.streams[_streamId].balanceStream = self.streams[_streamId].balanceStream - _amount
	log.WithdrawFromStream(_streamId, self.streams[_streamId].recipient, _amount)
	
	deposit: uint256 = self.depositOf(_streamId)

	if _amount == deposit:
		clear(self.streams[_streamId])
		self.updates[_streamId][self.streams[_streamId].sender] = False
		self.updates[_streamId][self.streams[_streamId].recipient] = False

	if _amount > 0:
		self.ERC20_contract = ERC20(self.streams[_streamId].tokenAddress)
		self.ERC20_contract.transfer(self.streams[_streamId].recipient, _amount)

@public
@constant
def getUpdate(_streamId: uint256, _addr: address) -> bool:
	assert self.streams[_streamId].sender != ZERO_ADDRESS, "stream doesn't exist"
	return self.updates[_streamId][_addr]

@public
@constant
def getStream(_streamId: uint256) -> (address, address, address, uint256, uint256, uint256, uint256, uint256):
	assert self.streams[_streamId].sender != ZERO_ADDRESS, "stream doesn't exist"

	stream: Stream = self.streams[_streamId]	
	return stream.sender, stream.recipient, stream.tokenAddress, stream.balanceStream, stream.timeframe.start, stream.timeframe.stopTime, stream.rate.payment, stream.rate.interval

