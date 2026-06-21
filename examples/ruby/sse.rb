#!/usr/bin/env ruby
# SSE consumer for /v1/stream. Requires Trader / Developer / Enterprise tier.
#
#   bundle install
#   export ORUK_API_KEY=ork_xxxxxxxx
#   ruby sse.rb
require 'json'
require 'ld-eventsource'  # gem: ld-eventsource

abort 'Set ORUK_API_KEY first.' unless (key = ENV['ORUK_API_KEY'])

client = SSE::Client.new(
  'https://api.oruk.ai/v1/stream',
  headers: { 'X-API-Key' => key, 'Accept' => 'text/event-stream' },
)

client.on_event do |event|
  data = JSON.parse(event.data) rescue {}
  case event.type
  when 'story'
    puts "[#{(data['id'] || '')[4, 8]}] #{(data['urgency'] || '?').ljust(9)} " \
         "#{(data['category'] || '?').ljust(9)} #{data['headline']}"
  when 'corroboration'
    puts "  ↑ +#{(data['newSource'] || '').ljust(20)} now #{data['count'] || 0} sources on " \
         "#{(data['storyId'] || '')[4, 8]}"
  when 'heartbeat'
    puts "· heartbeat - #{data['activeSources'] || 0} sources live"
  else
    puts "[#{event.type}] #{data.to_json}"
  end
end

client.on_error do |err|
  warn "[sse] error: #{err.inspect} (will auto-reconnect)"
end

# Block forever. ld-eventsource handles reconnect + Last-Event-ID automatically.
loop { sleep 1 }
