require 'rubygems'
require 'sinatra'

get "/:tracka/:trackb" do
  erb :show
end