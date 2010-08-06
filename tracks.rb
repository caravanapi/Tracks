require 'rubygems'
require 'sinatra'

get "/:event/:tracka/:trackb" do
  erb :show
end